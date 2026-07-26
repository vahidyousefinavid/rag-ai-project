import os

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()

STT_TTS_URL = os.getenv("STT_TTS_SERVICE_URL", "http://127.0.0.1:8010")


@router.get("/voices")
async def list_voices():
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(f"{STT_TTS_URL}/api/voices")
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"TTS service error: {e}")
    return resp.json()


@router.post("/speak")
async def speak(body: dict):
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(f"{STT_TTS_URL}/api/speak", json=body)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"TTS service error: {e}")
    return Response(content=resp.content, media_type="audio/mpeg")
