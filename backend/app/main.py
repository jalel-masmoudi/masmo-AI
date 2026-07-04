import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.voice_routes import router as voice_router
from app.core.llm_router import heuristic_only, llm_available
from app.services import gradium_service

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Masmo API", version="0.1.0")

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
extra_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*default_origins, *extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(voice_router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "llm_configured": llm_available(),
        "heuristic_only": heuristic_only(),
        "gradium_configured": gradium_service.gradium_available(),
    }
