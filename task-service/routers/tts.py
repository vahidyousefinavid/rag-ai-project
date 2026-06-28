import io
import edge_tts
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()

# fa-IR-DilaraNeural = صدای زن فارسی  |  fa-IR-FaridNeural = صدای مرد فارسی
DEFAULT_VOICE = "fa-IR-DilaraNeural"


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
