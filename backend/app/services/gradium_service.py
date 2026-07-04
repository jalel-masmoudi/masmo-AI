"""Gradium voice layer: STT, TTS, and report translation."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from gradium import GradiumClient
from gradium.speech import STTSetup, TTSSetup

from app.core.llm_router import call_llm

SupportedLanguage = Literal["en", "fr", "de", "es", "pt"]

SUPPORTED_LANGUAGES: list[SupportedLanguage] = ["en", "fr", "de", "es", "pt"]

LANGUAGE_LABELS: dict[SupportedLanguage, str] = {
    "en": "English",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "pt": "Portuguese",
}

DEFAULT_VOICE_IDS: dict[SupportedLanguage, str] = {
    "en": "YTpq7expH9539ERJ",
    "fr": "LFZvm12tW_z0xfGo",
    "de": "YTpq7expH9539ERJ",
    "es": "LFZvm12tW_z0xfGo",
    "pt": "YTpq7expH9539ERJ",
}

BRIEFING_INTROS: dict[SupportedLanguage, str] = {
    "en": "Executive Briefing.",
    "fr": "Briefing exécutif.",
    "de": "Executive Briefing.",
    "es": "Informe ejecutivo.",
    "pt": "Briefing executivo.",
}


def gradium_available() -> bool:
    return bool(os.getenv("GRADIUM_API_KEY"))


@lru_cache(maxsize=1)
def get_gradium_client() -> GradiumClient:
    api_key = os.getenv("GRADIUM_API_KEY")
    if not api_key:
        raise RuntimeError("GRADIUM_API_KEY is not configured")
    return GradiumClient(api_key=api_key)


def voice_id_for_language(language: SupportedLanguage) -> str:
    env_key = f"GRADIUM_VOICE_{language.upper()}"
    return os.getenv(env_key, DEFAULT_VOICE_IDS[language])


def _input_format_for_content_type(content_type: str) -> str:
    normalized = content_type.lower().split(";")[0].strip()
    if normalized in {"audio/wav", "audio/x-wav", "audio/wave"}:
        return "wav"
    if normalized in {"audio/webm", "audio/ogg"}:
        return "opus"
    if normalized == "audio/mpeg":
        return "mp3"
    return "wav"


async def transcribe_audio(audio_bytes: bytes, content_type: str = "audio/wav") -> str:
    client = get_gradium_client()
    setup: STTSetup = {
        "model_name": "default",
        "input_format": _input_format_for_content_type(content_type),
    }
    result = await client.stt(setup, audio_bytes)
    return result.text.strip()


async def synthesize_speech(text: str, language: SupportedLanguage = "en") -> bytes:
    client = get_gradium_client()
    setup: TTSSetup = {
        "model_name": "default",
        "voice_id": voice_id_for_language(language),
        "output_format": "wav",
    }
    result = await client.tts(setup, text)
    return result.raw_data


def translate_text(text: str, target_language: SupportedLanguage) -> str:
    if target_language == "en":
        return text

    label = LANGUAGE_LABELS[target_language]
    system_prompt = (
        "You are a professional translator for enterprise investigation reports. "
        "Preserve markdown structure, headings, bullet lists, and technical identifiers "
        "(ticket IDs, system names, project codes). Return only the translated text."
    )
    user_prompt = f"Translate the following report to {label}:\n\n{text}"
    translated = call_llm(system_prompt, user_prompt)
    return translated if translated else text


def build_briefing_script(
    root_cause: str,
    business_impact: str,
    recommendations: str,
    language: SupportedLanguage = "en",
) -> str:
    recommendation_line = ""
    for line in recommendations.splitlines():
        cleaned = line.strip().lstrip("-*").strip()
        if cleaned:
            recommendation_line = cleaned
            break

    intro = BRIEFING_INTROS[language]
    parts = [intro, root_cause, business_impact]
    if recommendation_line:
        if language == "fr":
            parts.append(f"Recommandation : {recommendation_line}")
        elif language == "de":
            parts.append(f"Empfehlung: {recommendation_line}")
        elif language == "es":
            parts.append(f"Recomendación: {recommendation_line}")
        elif language == "pt":
            parts.append(f"Recomendação: {recommendation_line}")
        else:
            parts.append(f"Recommendation: {recommendation_line}")

    return " ".join(part for part in parts if part)
