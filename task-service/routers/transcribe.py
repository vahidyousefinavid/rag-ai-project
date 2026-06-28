import json
import os
import tempfile

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from faster_whisper import WhisperModel

router = APIRouter()

_model: WhisperModel | None = None

# ── کلیدواژه‌های فرمان صوتی ─────────────────────────────────────────────────
_INTENTS: dict[str, list[str]] = {
    "confirm": ["آره", "بله", "باشه", "اضافه", "بزن", "ثبت", "ok", "yes", "درسته", "آوکی", "قبوله", "آوکی", "بکن"],
    "discard": ["نه", "بیخیال", "لغو", "نمیخوام", "cancel", "no", "نخیر", "نکن", "حذف"],
    "read":    ["بخون", "بگو", "بخوانشان", "بخوانشون", "بلند", "بلندخوان", "برام بگو", "چیه", "چیا"],
}

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
        "You are a task extraction assistant. Extract actionable tasks from the user's spoken text.\n"
        "The text may be in Persian (Farsi) or English. Keep the task title in the SAME language as the input.\n\n"
        "RULES:\n"
        "- title: a FULL descriptive sentence explaining what needs to be done (5-15 words). "
        "Do NOT use single words. Capture WHO does WHAT and WHERE/FOR WHAT system.\n"
        "- description: additional context, acceptance criteria, or null if nothing extra was said\n"
        '- priority: "high" if urgent/important, "medium" default, "low" if minor\n\n'
        "EXAMPLES:\n"
        'Input: "باید یه صفحه لاگین برای سامانه ضوابط درست کنیم"\n'
        'Output: [{"title": "طراحی و پیاده‌سازی صفحه لاگین در سامانه ضوابط", "description": null, "priority": "medium"}]\n\n'
        'Input: "یه باگ توی فرم ثبت نام هست که ایمیل رو validate نمیکنه، باید فوری درستش کنیم"\n'
        'Output: [{"title": "رفع باگ validate نشدن ایمیل در فرم ثبت‌نام", "description": "ایمیل وارد شده در فرم ثبت‌نام اعتبارسنجی نمی‌شود", "priority": "high"}]\n\n'
        'Input: "Create a login page for the regulations system"\n'
        'Output: [{"title": "Create login page for the regulations system", "description": null, "priority": "medium"}]\n\n'
        "Return ONLY a valid JSON array, no explanation, no markdown fences.\n\n"
        f"Input text:\n{text}\n\nJSON:"
    )

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": LLM_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1, "top_p": 0.9},
                },
            )
            resp.raise_for_status()
            raw: str = resp.json().get("response", "[]")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    # Extract JSON array from the response (model sometimes wraps in prose/fences)
    raw = raw.strip()
    if "```" in raw:
        raw = raw.split("```")[1] if "```json" not in raw else raw.split("```json")[1]
        raw = raw.split("```")[0]

    start, end = raw.find("["), raw.rfind("]") + 1
    try:
        extracted = json.loads(raw[start:end]) if start != -1 else []
        # Validate and clean each task
        cleaned = []
        for item in extracted:
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            cleaned.append({
                "title": title,
                "description": item.get("description") or None,
                "priority": item.get("priority", "medium") if item.get("priority") in ("low", "medium", "high") else "medium",
            })
        extracted = cleaned
    except json.JSONDecodeError:
        # Fallback: use the full text as a single task title
        extracted = [{"title": text[:150], "description": None, "priority": "medium"}]

    return {"tasks": extracted, "source_text": text}


@router.post("/voice-intent")
async def voice_intent(file: UploadFile = File(...)):
    """Transcribe a short voice command and return parsed intent (confirm/discard/read/unknown)."""
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        model = _get_model()
        segments, _ = model.transcribe(tmp_path, beam_size=3, language=WHISPER_LANGUAGE or None)
        text = " ".join(seg.text.strip() for seg in segments).strip()
    finally:
        os.unlink(tmp_path)

    intent = "unknown"
    for name, keywords in _INTENTS.items():
        if any(k in text for k in keywords):
            intent = name
            break

    return {"text": text, "intent": intent}
