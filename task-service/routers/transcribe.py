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
    "confirm": ["آره", "بله", "باشه", "اضافه", "بزن", "ثبت", "ok", "yes", "درسته", "آوکی", "قبوله", "بکن"],
    "discard": ["نه", "بیخیال", "لغو", "نمیخوام", "cancel", "no", "نخیر", "نکن", "حذف"],
    "read":    ["بخون", "بگو", "بخوانشان", "بخوانشون", "بلند", "بلندخوان", "برام بگو", "چیه", "چیا"],
}

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:7998")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "llama3.1")

# large-v3 = بالاترین دقت فارسی
# WHISPER_MODEL env: large-v3 | medium | base | small
# WHISPER_DEVICE env: cpu | cuda  (cuda اگه GPU داری خیلی سریع‌تره)
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL",  "large-v3")
WHISPER_DEVICE     = os.getenv("WHISPER_DEVICE", "cuda")
WHISPER_LANGUAGE   = os.getenv("WHISPER_LANGUAGE", "fa")

_COMPUTE_TYPE = "int8"


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        print(f"[Whisper] loading {WHISPER_MODEL_SIZE} on {WHISPER_DEVICE} ({_COMPUTE_TYPE})…")
        _model = WhisperModel(WHISPER_MODEL_SIZE, device=WHISPER_DEVICE, compute_type=_COMPUTE_TYPE)
        print("[Whisper] model ready.")
    return _model


def _transcribe_file(path: str, beam_size: int = 5) -> tuple[str, str, bool]:
    """Returns (text, language, no_speech)."""
    model = _get_model()
    lang  = WHISPER_LANGUAGE if WHISPER_LANGUAGE else None

    segments, info = model.transcribe(
        path,
        language=lang,
        beam_size=beam_size,
        condition_on_previous_text=False,
        no_speech_threshold=0.9,
        initial_prompt="گفتار فارسی:",
    )

    text = " ".join(s.text.strip() for s in segments if s.text.strip()).strip()
    return text, info.language, not bool(text)


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text, lang, no_speech = _transcribe_file(tmp_path, beam_size=5)
    finally:
        os.unlink(tmp_path)

    return {"text": text, "language": lang, "no_speech": no_speech}


@router.post("/voice-intent")
async def voice_intent(file: UploadFile = File(...)):
    """Transcribe a short voice command and return parsed intent."""
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text, _, no_speech = _transcribe_file(tmp_path, beam_size=3)
    finally:
        os.unlink(tmp_path)

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
