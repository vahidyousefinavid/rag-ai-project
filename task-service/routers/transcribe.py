import json
import os

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter()

# ── کلیدواژه‌های فرمان صوتی ─────────────────────────────────────────────────
_INTENTS: dict[str, list[str]] = {
    "confirm": ["آره", "بله", "باشه", "اضافه", "بزن", "ثبت", "ok", "yes", "درسته", "آوکی", "قبوله", "بکن"],
    "discard": ["نه", "بیخیال", "لغو", "نمیخوام", "cancel", "no", "نخیر", "نکن", "حذف"],
    "read":    ["بخون", "بگو", "بخوانشان", "بخوانشون", "بلند", "بلندخوان", "برام بگو", "چیه", "چیا"],
}

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:7998")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "llama3.1")

STT_TTS_URL = os.getenv("STT_TTS_SERVICE_URL", "http://127.0.0.1:8010")


async def _transcribe_via_service(filename: str, data: bytes, beam_size: int = 5) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            resp = await client.post(
                f"{STT_TTS_URL}/api/transcribe",
                params={"beam_size": beam_size},
                files={"file": (filename or "audio.webm", data)},
            )
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"STT service error: {e}")
    return resp.json()


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    data = await file.read()
    return await _transcribe_via_service(file.filename, data, beam_size=5)


@router.post("/voice-intent")
async def voice_intent(file: UploadFile = File(...)):
    """Transcribe a short voice command and return parsed intent."""
    data = await file.read()
    result = await _transcribe_via_service(file.filename, data, beam_size=3)
    text, no_speech = result.get("text", ""), result.get("no_speech", False)

    if no_speech:
        return {"text": "", "intent": "unknown", "no_speech": True}

    intent = "unknown"
    for name, keywords in _INTENTS.items():
        if any(k in text for k in keywords):
            intent = name
            break

    return {"text": text, "intent": intent, "no_speech": False}


@router.post("/extract-tasks")
async def extract_tasks(body: dict):
    text: str = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    prompt = (
        "You are a task extraction assistant. Extract actionable tasks from the user's spoken text.\n"
        "The text may be in Persian (Farsi) or English. Keep the task title in the SAME language as the input.\n\n"
        "RULES:\n"
        "- title: a FULL descriptive sentence (5-15 words). Do NOT use single words.\n"
        "- description: additional context, or null\n"
        '- priority: "high" if urgent, "medium" default, "low" if minor\n\n'
        "EXAMPLES:\n"
        'Input: "باید یه صفحه لاگین برای سامانه ضوابط درست کنیم"\n'
        'Output: [{"title": "طراحی صفحه لاگین در سامانه ضوابط", "description": null, "priority": "medium"}]\n\n'
        'Input: "یه باگ فوری توی فرم ثبت‌نام هست"\n'
        'Output: [{"title": "رفع باگ فوری در فرم ثبت‌نام", "description": null, "priority": "high"}]\n\n'
        "Return ONLY a valid JSON array, no markdown.\n\n"
        f"Input:\n{text}\n\nJSON:"
    )

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.1}},
            )
            resp.raise_for_status()
            raw: str = resp.json().get("response", "[]")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    raw = raw.strip()
    if "```" in raw:
        raw = raw.split("```json")[1] if "```json" in raw else raw.split("```")[1]
        raw = raw.split("```")[0]

    start, end = raw.find("["), raw.rfind("]") + 1
    try:
        extracted = json.loads(raw[start:end]) if start != -1 else []
        cleaned = []
        for item in extracted:
            title = str(item.get("title", "")).strip()
            if title:
                cleaned.append({
                    "title": title,
                    "description": item.get("description") or None,
                    "priority": item.get("priority", "medium") if item.get("priority") in ("low", "medium", "high") else "medium",
                })
        extracted = cleaned
    except json.JSONDecodeError:
        extracted = [{"title": text[:150], "description": None, "priority": "medium"}]

    return {"tasks": extracted, "source_text": text}
