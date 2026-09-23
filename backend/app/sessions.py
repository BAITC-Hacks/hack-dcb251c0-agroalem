from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class SessionState:
    turn: int = 0
    low_confidence_streak: int = 0
    active_scenario_id: str | None = None
    history: list[dict[str, Any]] = field(default_factory=list)

    def append_history(self, item: dict[str, Any]) -> None:
        self.history.append(item)
        if len(self.history) > 10:
            del self.history[:-10]


class SessionStore:
    def __init__(self) -> None:
        self._states: dict[str, SessionState] = {}
        self._lock = Lock()

    def get(self, session_id: str) -> SessionState:
        with self._lock:
            return self._states.setdefault(session_id, SessionState())

    def clear(self) -> None:
        with self._lock:
            self._states.clear()
