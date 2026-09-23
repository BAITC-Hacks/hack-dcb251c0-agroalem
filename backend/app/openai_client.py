"""Small OpenAI REST adapter. No alternative providers or browser credentials."""
from __future__ import annotations

import json
import os
from types import SimpleNamespace
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError


class ProviderError(RuntimeError):
    status_code = 502
    code = "provider_error"


class ProviderNotConfigured(ProviderError):
    status_code = 503
    code = "provider_not_configured"


class ProviderTimeout(ProviderError):
    status_code = 504
    code = "provider_timeout"


def strict_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Make Pydantic's JSON schema meet the Responses strict-object contract."""
    schema = model.model_json_schema()

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            node.pop("default", None)
            if node.get("type") == "object":
                node["additionalProperties"] = False
                node["required"] = list(node.get("properties", {}))
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(schema)
    return schema


class OpenAIClient:
    """Synchronous, injectable HTTP client for the three official OpenAI APIs."""

    def __init__(self, *, api_key: str | None = None,
                 timeout: float = 45.0, transport: httpx.BaseTransport | None = None):
        key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY", "")
        if not key.strip():
            raise ProviderNotConfigured("OPENAI_API_KEY is not configured on the server")
        # A fixed origin prevents a local config typo from sending the key elsewhere.
        self.http = httpx.Client(
            base_url="https://api.openai.com/v1/",
            headers={"Authorization": f"Bearer {key.strip()}"},
            timeout=httpx.Timeout(timeout, connect=min(timeout, 10.0)),
            follow_redirects=False,
            transport=transport,
        )
        self.responses = self

    def close(self) -> None:
        self.http.close()

    def _post(self, path: str, **kwargs: Any) -> httpx.Response:
        try:
            response = self.http.post(path, **kwargs)
        except httpx.TimeoutException as exc:
            raise ProviderTimeout("OpenAI request timed out") from exc
        except httpx.HTTPError as exc:
            raise ProviderError("OpenAI connection failed") from exc
        if response.status_code in (401, 403):
            raise ProviderNotConfigured("OpenAI rejected the server credentials or model access")
        if response.status_code == 429:
            raise ProviderError("OpenAI rate limit or API quota reached")
        if response.status_code >= 400 or response.is_redirect:
            raise ProviderError(f"OpenAI request failed (HTTP {response.status_code})")
        return response

    def parse(self, *, model: str, instructions: str, input: str,
              text_format: type[BaseModel], max_output_tokens: int = 1800) -> Any:
        response = self._post("responses", json={
            "model": model, "instructions": instructions, "input": input,
            "store": False, "max_output_tokens": max_output_tokens,
            "text": {"format": {"type": "json_schema", "name": text_format.__name__,
                                  "strict": True, "schema": strict_schema(text_format)}},
        })
        try:
            body = response.json()
            if not isinstance(body, dict) or body.get("status") != "completed":
                raise ValueError("Incomplete response")
            parts: list[str] = []
            for item in body.get("output", []):
                for part in item.get("content", []):
                    if part.get("type") == "refusal":
                        raise ValueError("Provider refusal")
                    if part.get("type") == "output_text":
                        parts.append(part["text"])
            if not parts:
                raise ValueError("No structured output")
            parsed = text_format.model_validate_json("".join(parts))
        except (ValueError, TypeError, KeyError, AttributeError, ValidationError) as exc:
            raise ProviderError("OpenAI returned invalid or incomplete structured output") from exc
        return SimpleNamespace(output_parsed=parsed, request_id=response.headers.get("x-request-id"))

    def transcribe(self, *, model: str, audio: bytes, filename: str, mime: str) -> str:
        response = self._post(
            "audio/transcriptions",
            data={"model": model, "response_format": "json"},
            files={"file": (filename, audio, mime)},
        )
        try:
            text = response.json()["text"]
            if not isinstance(text, str) or not text.strip():
                raise ValueError("No speech")
        except (ValueError, TypeError, KeyError) as exc:
            raise ProviderError("OpenAI did not return a non-empty transcript") from exc
        return text.strip()

    def synthesize(self, *, model: str, text: str, voice: str) -> bytes:
        response = self._post("audio/speech", json={
            "model": model, "input": text, "voice": voice, "response_format": "mp3",
        })
        if not response.content or "json" in response.headers.get("content-type", "").lower():
            raise ProviderError("OpenAI did not return speech audio")
        return response.content
