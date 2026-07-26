import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import LedgerEntry

router = APIRouter()

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:7998")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "llama3.1")

_SYSTEM = """تو یک دستیار حسابداری هستی که به فارسی صحبت می‌کنی. وظیفه‌ات جواب دادن به سوالات کاربر
دربارهٔ حساب‌وکتاب کارگاه/پروژه‌اش بر اساس ردیف‌های زیره. کوتاه، دقیق، و با عدد جواب بده.
اگر اطلاعات کافی برای جواب نبود، همینو بگو."""


class AskRequest(BaseModel):
    project_id: Optional[str] = None
    question: str
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


def _apply_filters(stmt, project_id: Optional[str], date_from: Optional[datetime], date_to: Optional[datetime]):
    if project_id:
        stmt = stmt.where(LedgerEntry.project_id == project_id)
    if date_from:
        stmt = stmt.where(LedgerEntry.occurred_at >= date_from)
    if date_to:
        stmt = stmt.where(LedgerEntry.occurred_at <= date_to)
    return stmt


@router.get("/ledger/summary")
async def ledger_summary(
    project_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
):
    by_person_stmt = _apply_filters(
        select(LedgerEntry.person_name, func.sum(LedgerEntry.amount), func.count(LedgerEntry.id))
        .where(LedgerEntry.person_name.isnot(None))
        .group_by(LedgerEntry.person_name),
        project_id, date_from, date_to,
    )
    by_item_stmt = _apply_filters(
        select(LedgerEntry.item, func.sum(LedgerEntry.amount), func.count(LedgerEntry.id))
        .where(LedgerEntry.entry_type == "purchase", LedgerEntry.item.isnot(None))
        .group_by(LedgerEntry.item),
        project_id, date_from, date_to,
    )
    totals_stmt = _apply_filters(
        select(LedgerEntry.entry_type, func.sum(LedgerEntry.amount))
        .group_by(LedgerEntry.entry_type),
        project_id, date_from, date_to,
    )

    by_person = await db.execute(by_person_stmt)
    by_item   = await db.execute(by_item_stmt)
    totals    = await db.execute(totals_stmt)

    return {
        "by_person": [
            {"person_name": name, "total_amount": total or 0, "count": count}
            for name, total, count in by_person.all()
        ],
        "by_item": [
            {"item": item, "total_amount": total or 0, "count": count}
            for item, total, count in by_item.all()
        ],
        "totals": {entry_type: total or 0 for entry_type, total in totals.all()},
    }


@router.post("/ledger/ask")
async def ledger_ask(data: AskRequest, db: AsyncSession = Depends(get_db)):
    question = data.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty question")

    stmt = _apply_filters(
        select(LedgerEntry).order_by(LedgerEntry.occurred_at),
        data.project_id, data.date_from, data.date_to,
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()

    TYPE_LABEL = {
        "labor_payment": "پرداخت دستمزد",
        "purchase":      "خرید",
        "expense":       "هزینه",
        "income":        "درآمد",
        "other":         "سایر",
    }
    lines = [
        f"- {e.occurred_at.date().isoformat()} | {TYPE_LABEL.get(e.entry_type, e.entry_type)}"
        f"{' | ' + e.person_name if e.person_name else ''}"
        f"{' | ' + e.item if e.item else ''}"
        f"{' | ' + str(e.amount) + ' تومان' if e.amount is not None else ''}"
        for e in entries
    ]
    entries_str = "\n".join(lines) if lines else "هیچ ردیفی ثبت نشده"

    prompt = f"{_SYSTEM}\n\nردیف‌های حساب:\n{entries_str}\n\nسوال کاربر: {question}\n\nپاسخ:"

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.2}},
            )
            resp.raise_for_status()
            reply: str = resp.json().get("response", "").strip()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    return {"reply": reply or "پاسخی پیدا نشد."}
