import io
import edge_tts
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()

DEFAULT_VOICE = "fa-IR-DilaraNeural"

# کش صداها — فقط یک بار از edge-tts گرفته می‌شه
_voices_cache: list[dict] | None = None


@router.get("/voices")
async def list_voices():
    """لیست صداهای فارسی موجود در edge-tts."""
    global _voices_cache
    if _voices_cache is None:
        all_voices = await edge_tts.list_voices()
        _voices_cache = [
            {
                "id": v["ShortName"],
                "name": v["ShortName"].split("-")[2].replace("Neural", ""),
                "gender": "female" if v["Gender"] == "Female" else "male",
                "locale": v["Locale"],
            }
            for v in all_voices
            if v["Locale"].startswith("fa-")
        ]
    return {"voices": _voices_cache}


@router.post("/speak")
async def speak(body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    voice = body.get("voice", DEFAULT_VOICE)
    try:
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return Response(content=buf.getvalue(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS error: {e}")
