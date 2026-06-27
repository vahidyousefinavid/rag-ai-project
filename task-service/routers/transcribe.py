import json
import os
import tempfile

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from faster_whisper import WhisperModel

router = APIRouter()

_model: WhisperModel | None = None

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:7998")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "llama3.1")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")  # tiny | base | small | medium
WHISPER_LANGUAGE  = os.getenv("WHISPER_LANGUAGE", "fa")   # fa=Persian, None=auto-detect


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    return _model


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Receive an audio blob and return its transcription via Faster-Whisper."""
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        model = _get_model()
        lang = WHISPER_LANGUAGE if WHISPER_LANGUAGE else None
        segments, info = model.transcribe(tmp_path, beam_size=5, language=lang)
        text = " ".join(seg.text.strip() for seg in segments).strip()
    finally:
        os.unlink(tmp_path)

    return {"text": text, "language": info.language}


@router.post("/extract-tasks")
async def extract_tasks(body: dict):
    """Send transcribed text to Ollama and parse extracted tasks as JSON."""
    text: str = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    prompt = (
        "You are a smart task-extraction assistant. The input may be in Persian (Farsi) or English.\n"
        "Read the text below and extract every actionable task mentioned.\n"
        "Return ONLY a valid JSON array — no explanation, no markdown fences.\n"
        "Each item must have:\n"
        '  "title": short task title in the same language as the input (max 70 chars)\n'
        '  "description": optional detail or null\n'
        '  "priority": "low" | "medium" | "high"\n\n'
        f"Text:\n{text}\n\nJSON:"
    )

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            raw: str = resp.json().get("response", "[]")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    # Extract JSON array from the response (model sometimes adds prose)
    start, end = raw.find("["), raw.rfind("]") + 1
    try:
        extracted = json.loads(raw[start:end]) if start != -1 else []
    except json.JSONDecodeError:
        extracted = []

    return {"tasks": extracted, "source_text": text}
