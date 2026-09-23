from __future__ import annotations
from contextlib import contextmanager
from copy import deepcopy
from dataclasses import dataclass, field
from threading import Lock
from time import monotonic
from typing import Any, Iterator

@dataclass
class SessionState:
    turn: int = 0
    low_confidence_streak: int = 0
    active_scenario_id: str | None = None
    history: list[dict[str, Any]] = field(default_factory=list)
    scenario_slots: dict[str, dict[str, Any]] = field(default_factory=dict)

    def append_history(self, item: dict[str, Any]) -> None:
        self.history.append(item)
        del self.history[:-10]

@dataclass
class _Entry:
    state: SessionState = field(default_factory=SessionState)
    lock: Any = field(default_factory=Lock)
    users: int = 0
    touched: float = field(default_factory=monotonic)

class SessionCapacityError(RuntimeError):
    pass

class SessionStore:
    """Bounded process-local store. One transaction per session; no partial writes."""
    def __init__(self, max_sessions: int = 1024, ttl: float = 3600):
        self._states: dict[str, _Entry] = {}
        self._lock = Lock()
        self.max_sessions, self.ttl = max_sessions, ttl

    def _entry(self, session_id: str) -> _Entry:
        now = monotonic()
        for key, entry in list(self._states.items()):
            if entry.users == 0 and now - entry.touched > self.ttl:
                del self._states[key]
        if session_id not in self._states:
            if len(self._states) >= self.max_sessions:
                idle = [(entry.touched, key) for key, entry in self._states.items() if not entry.users]
                if not idle:
                    raise SessionCapacityError("All session slots are currently busy")
                del self._states[min(idle)[1]]
            self._states[session_id] = _Entry()
        return self._states[session_id]

    def get(self, session_id: str) -> SessionState:
        # Compatibility for diagnostics/tests. Request handlers use transaction().
        with self._lock:
            return self._entry(session_id).state

    @contextmanager
    def transaction(self, session_id: str) -> Iterator[SessionState]:
        with self._lock:
            entry = self._entry(session_id)
            entry.users += 1
        try:
            with entry.lock:
                working = deepcopy(entry.state)
                yield working
                entry.state = working
        finally:
            with self._lock:
                entry.users -= 1
                entry.touched = monotonic()

    def clear(self) -> None:
        with self._lock:
            self._states.clear()
