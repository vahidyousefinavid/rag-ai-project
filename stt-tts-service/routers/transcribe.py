import os
import tempfile

from fastapi import APIRouter, UploadFile, File
from faster_whisper import WhisperModel

router = APIRouter()

_model: WhisperModel | None = None

# large-v3 = بالاترین دقت فارسی
# WHISPER_MODEL env: large-v3 | medium | base | small
# WHISPER_DEVICE env: cpu | cuda  (cuda اگه GPU داری خیلی سریع‌تره)
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "large-v3")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cuda")
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "fa")

# float16 روی GPU دقیق‌تره از int8؛ روی CPU باید int8 بمونه (float16 پشتیبانی نمیشه)
_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE") or ("float16" if WHISPER_DEVICE == "cuda" else "int8")


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
    lang = WHISPER_LANGUAGE if WHISPER_LANGUAGE else None

    segments, info = model.transcribe(
        path,
        language=lang,
        beam_size=beam_size,
        condition_on_previous_text=False,
        no_speech_threshold=0.9,
        initial_prompt="گفتار فارسی:",
        vad_filter=True,
    )

    text = " ".join(s.text.strip() for s in segments if s.text.strip()).strip()
    return text, info.language, not bool(text)


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), beam_size: int = 5):
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text, lang, no_speech = _transcribe_file(tmp_path, beam_size=beam_size)
    finally:
        os.unlink(tmp_path)

    return {"text": text, "language": lang, "no_speech": no_speech}
