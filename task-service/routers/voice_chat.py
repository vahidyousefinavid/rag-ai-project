import json
import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:7998")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "llama3.1")

_SYSTEM = """تو «دستیار تسک» هستی که به فارسی صحبت می‌کنی.
وظیفه‌ات کمک به مدیریت تسک‌هاست. مثل یک همکار باهوش، کوتاه و گرم حرف بزن.

دقیقاً یک JSON object برگردون (هیچ متن دیگه‌ای نباشه):
{"reply": "پاسخ فارسی تو", "actions": [...]}

برای actions از این types استفاده کن:
- ساخت تسک:       {"type":"create",   "title":"عنوان کامل",     "priority":"low|medium|high"}
- تغییر وضعیت:    {"type":"status",   "title":"بخشی از عنوان", "status":"todo|in_progress|done"}
- تغییر اولویت:   {"type":"priority", "title":"بخشی از عنوان", "priority":"low|medium|high"}
- حذف تسک:        {"type":"delete",   "title":"بخشی از عنوان"}
- بدون عملیات:    {"type":"none"}

مثال‌ها:
کاربر: «باید صفحه لاگین برای سامانه ضوابط بسازم»
→ {"reply": "باشه! تسک طراحی صفحه لاگین سامانه ضوابط رو ثبت کردم.", "actions": [{"type":"create","title":"طراحی صفحه لاگین سامانه ضوابط","priority":"medium"}]}

کاربر: «اولویتش رو بالا کن»
→ {"reply": "اوکی، اولویت رو به بالا تغییر دادم ✓", "actions": [{"type":"priority","title":"صفحه لاگین","priority":"high"}]}

کاربر: «شروع کردم روی باگ فرم»
→ {"reply": "خوبه! وضعیتش رو به «در حال انجام» تغییر دادم.", "actions": [{"type":"status","title":"باگ فرم","status":"in_progress"}]}

کاربر: «تسک‌هام رو بگو»
→ {"reply": "...(فهرست تسک‌ها)...", "actions": [{"type":"none"}]}"""


@router.post("/voice-chat")
async def voice_chat(body: dict):
    message: str = body.get("message", "").strip()
    history: list = body.get("history", [])
    tasks: list   = body.get("tasks", [])

    if not message:
        raise HTTPException(status_code=400, detail="Empty message")

    tasks_str = "\n".join(
        f"- [{t.get('status','todo')}][{t.get('priority','medium')}] {t.get('title','')}"
        for t in tasks[:30]
    ) or "هیچ تسکی روی بورد نیست"

    history_str = "\n".join(
        f"{'کاربر' if h['role'] == 'user' else 'دستیار'}: {h['content']}"
        for h in history[-8:]
    )

    prompt = (
        f"{_SYSTEM}\n\n"
        f"تسک‌های فعلی:\n{tasks_str}\n\n"
        + (f"تاریخچه:\n{history_str}\n\n" if history_str else "")
        + f"کاربر: {message}\n\nJSON:"
    )

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.2, "top_p": 0.9}},
            )
            resp.raise_for_status()
            raw: str = resp.json().get("response", "")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama: {e}")

    raw = raw.strip()
    if "```" in raw:
        raw = raw.split("```json")[1] if "```json" in raw else raw.split("```")[1]
        raw = raw.split("```")[0]

    try:
        s, e2 = raw.find("{"), raw.rfind("}") + 1
        data = json.loads(raw[s:e2]) if s != -1 else {}
    except json.JSONDecodeError:
        data = {}

    return {
        "reply":   data.get("reply", "ببخشید، مشکلی پیش اومد. دوباره بگو؟"),
        "actions": data.get("actions", [{"type": "none"}]),
    }
