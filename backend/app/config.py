from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    router_model: str


def load_local_environment() -> None:
    # Local-only convenience. Existing process env always wins.
    load_dotenv(ROOT / ".env.local", override=False)
    load_dotenv(ROOT / ".env", override=False)


def load_settings() -> Settings:
    load_local_environment()
    return Settings(
        router_model=os.getenv("OPENAI_ROUTER_MODEL", "gpt-5.6-luna"),
    )
