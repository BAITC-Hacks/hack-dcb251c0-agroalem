from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    router_model: str = "gpt-4.1-mini"
    response_model: str = "gpt-4.1-mini"
    stt_model: str = "gpt-4o-mini-transcribe"
    tts_model: str = "gpt-4o-mini-tts"
    voice: str = "coral"
    provider_timeout: float = 45.0


def load_local_environment() -> None:
    load_dotenv(ROOT / ".env.local", override=False)
    load_dotenv(ROOT / ".env", override=False)


def load_settings() -> Settings:
    load_local_environment()
    timeout = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "45"))
    if not 1 <= timeout <= 180:
        raise ValueError("OPENAI_TIMEOUT_SECONDS must be between 1 and 180")
    return Settings(
        router_model=os.getenv("OPENAI_ROUTER_MODEL", "gpt-4.1-mini"),
        response_model=os.getenv("OPENAI_RESPONSE_MODEL", "gpt-4.1-mini"),
        stt_model=os.getenv("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe"),
        tts_model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        voice=os.getenv("OPENAI_TTS_VOICE", "coral"),
        provider_timeout=timeout,
    )
