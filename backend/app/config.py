from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    router_model: str


def load_settings() -> Settings:
    return Settings(
        router_model=os.getenv("OPENAI_ROUTER_MODEL", "gpt-5.6-luna"),
    )
