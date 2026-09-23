from __future__ import annotations

from time import perf_counter
from typing import Any
from fastapi import HTTPException, UploadFile
from .config import Settings

MAX_AUDIO_BYTES = 20 * 1024 * 1024
AUDIO_TYPES = {
    "audio/webm": ".webm", "video/webm": ".webm",
    "audio/mp4": ".mp4", "video/mp4": ".mp4", "audio/x-m4a": ".m4a",
    "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/mpga": ".mpga",
    "audio/wav": ".wav", "audio/x-wav": ".wav",
}


def read_audio(file: UploadFile) -> tuple[bytes, str, str]:
    mime = (file.content_type or "").split(";", 1)[0].strip().lower()
    if mime not in AUDIO_TYPES:
        raise HTTPException(415, "Use WebM, MP4/M4A, MP3 or WAV audio")
    content = file.file.read(MAX_AUDIO_BYTES + 1)
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio upload exceeds 20 MiB")
    if not content:
        raise HTTPException(422, "Audio file is empty")
    # Browser-provided names are not used as filesystem paths or shell arguments.
    return content, "recording" + AUDIO_TYPES[mime], mime


def transcribe(*, client: Any, settings: Settings, file: UploadFile) -> tuple[str, float]:
    content, filename, mime = read_audio(file)
    started = perf_counter()
    text = client.transcribe(model=settings.stt_model, audio=content, filename=filename, mime=mime)
    if not isinstance(text, str) or not text.strip() or len(text.strip()) > 4000:
        raise HTTPException(422, "Transcript is empty or exceeds 4000 characters")
    return text.strip(), (perf_counter() - started) * 1000


def synthesize(*, client: Any, settings: Settings, text: str) -> tuple[bytes, float]:
    if not text.strip() or len(text) > 2000:
        raise HTTPException(422, "Speech text must have 1 to 2000 characters")
    started = perf_counter()
    content = client.synthesize(model=settings.tts_model, text=text, voice=settings.voice)
    return content, (perf_counter() - started) * 1000
