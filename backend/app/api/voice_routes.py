from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.api.schemas import (
    TranslateReportRequest,
    TranslateReportResponse,
    TTSRequest,
    VoiceStatusResponse,
)
from app.services import gradium_service

router = APIRouter(prefix="/voice", tags=["voice"])


@router.get("/status", response_model=VoiceStatusResponse)
def voice_status() -> VoiceStatusResponse:
    return VoiceStatusResponse(
        gradium_configured=gradium_service.gradium_available(),
        languages=[
            {"code": code, "label": gradium_service.LANGUAGE_LABELS[code]}
            for code in gradium_service.SUPPORTED_LANGUAGES
        ],
    )


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    content_type: str | None = Form(default=None),
) -> dict[str, str]:
    if not gradium_service.gradium_available():
        raise HTTPException(
            status_code=503,
            detail="Gradium STT is not configured. Set GRADIUM_API_KEY on the backend.",
        )

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload")

    mime = content_type or audio.content_type or "audio/wav"
    try:
        transcript = await gradium_service.transcribe_audio(audio_bytes, mime)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gradium STT failed: {exc}") from exc

    if not transcript:
        raise HTTPException(status_code=422, detail="No speech detected in audio")

    return {"transcript": transcript}


@router.post("/tts")
async def text_to_speech(request: TTSRequest) -> Response:
    if not gradium_service.gradium_available():
        raise HTTPException(
            status_code=503,
            detail="Gradium TTS is not configured. Set GRADIUM_API_KEY on the backend.",
        )

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    language = request.language
    if language not in gradium_service.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

    try:
        audio_bytes = await gradium_service.synthesize_speech(text, language)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gradium TTS failed: {exc}") from exc

    return Response(content=audio_bytes, media_type="audio/wav")


@router.post("/translate-report", response_model=TranslateReportResponse)
def translate_report(request: TranslateReportRequest) -> TranslateReportResponse:
    report = request.report.strip()
    if not report:
        raise HTTPException(status_code=400, detail="Report text is required")

    language = request.language
    if language not in gradium_service.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

    translated = gradium_service.translate_text(report, language)
    return TranslateReportResponse(
        language=language,
        report=translated,
        provider="gradium+llm" if language != "en" else "original",
    )
