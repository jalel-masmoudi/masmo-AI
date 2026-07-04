"""LiteLLM router: Vultr primary, OpenRouter fallback."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from litellm import completion

VULTR_MODEL = os.getenv("VULTR_MODEL", "vultr/llama-3.1-8b-instruct")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/meta-llama/llama-3.1-8b-instruct")
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "20"))


def heuristic_only() -> bool:
    """Skip LLM calls — use deterministic planner/observer/reporter paths."""
    return os.getenv("MASMO_HEURISTIC_ONLY", "").lower() in {"1", "true", "yes"}


def llm_available() -> bool:
    if heuristic_only():
        return False
    return bool(
        os.getenv("VULTR_API_KEY")
        or os.getenv("OPENROUTER_API_KEY")
        or os.getenv("LITELLM_API_KEY")
    )


def call_llm(system_prompt: str, user_prompt: str) -> str | None:
    """Call LLM with Vultr first, then OpenRouter. Returns None if both fail."""
    if not llm_available():
        return None
    for model in (VULTR_MODEL, OPENROUTER_MODEL):
        try:
            response = completion(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                timeout=LLM_TIMEOUT_SECONDS,
            )
            content = response.choices[0].message.content
            if content:
                return content
        except Exception as exc:
            message = str(exc).lower()
            if any(token in message for token in ("auth", "401", "403", "unauthorized", "invalid api key")):
                break
            continue
    return None


def parse_json_response(text: str) -> dict[str, Any] | None:
    """Extract a JSON object from an LLM response."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None
