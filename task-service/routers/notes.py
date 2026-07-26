import json
import os
import tempfile
import uuid
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import LedgerEntry, Note
from routers.transcribe import _transcribe_file

router = APIRouter()

VALID_KINDS       = {"text", "voice"}
VALID_CATEGORIES  = {"general", "site_log", "labor", "purchase", "expense", "reminder"}
LEDGER_CATEGORIES = {"site_log", "labor", "purchase", "expense"}
VALID_ENTRY_TYPES = {"labor_payment", "purchase", "expense", "income", "other"}

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:7998")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "llama3.1")

_EXTRACT_PROMPT = """تو یک دستیار استخراج اطلاعات مالی از یادداشت‌های کارگاهی فارسی هستی.
از متن زیر، هر ردیف پرداخت/خرید/هزینه/درآمدی که پیدا می‌کنی رو به‌صورت JSON array برگردون. اگر چیزی پیدا نکردی، آرایه‌ی خالی برگردون.

هر آیتم باید این شکل باشه:
{"entry_type": "labor_payment|purchase|expense|income|other", "person_name": "اسم شخص یا null", "item": "شرح کالا/کار یا null", "amount": مبلغ به تومان به‌صورت عدد یا null}

قوانین:
- labor_payment: پرداخت دستمزد به یک کارگر/نفر
- purchase: خرید ابزار یا کالا
- expense: سایر هزینه‌ها (حمل‌ونقل، اجاره، و ...)
- income: پولی که دریافت شده (نه پرداخت شده)
- amount را فقط عدد بنویس (بدون کاما یا واحد)

مثال:
ورودی: «امروز به علی ۵۰۰ هزار تومان دادم بابت دستمزد و یک دریل ۲۰۰ هزار تومان خریدم»
خروجی: [{"entry_type":"labor_payment","person_name":"علی","item":null,"amount":500000},{"entry_type":"purchase","person_name":null,"item":"دریل","amount":200000}]

فقط JSON array برگردون، هیچ متن دیگه‌ای ننویس.

متن:
{text}

JSON:"""


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    project_id: Optional[str] = None
    category: str = "general"
    content: str
    note_date: Optional[datetime] = None


class NoteUpdate(BaseModel):
    project_id: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    note_date: Optional[datetime] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_note(n: Note) -> dict:
    return {
        "id": n.id,
        "project_id": n.project_id,
        "kind": n.kind,
        "category": n.category,
        "content": n.content,
        "note_date": n.note_date.isoformat() if n.note_date else None,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


def _serialize_entry(e: LedgerEntry) -> dict:
    return {
        "id": e.id,
        "note_id": e.note_id,
        "project_id": e.project_id,
        "entry_type": e.entry_type,
        "person_name": e.person_name,
        "item": e.item,
        "amount": e.amount,
        "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
    }


async def _extract_ledger(db: AsyncSession, note: Note) -> list[LedgerEntry]:
    prompt = _EXTRACT_PROMPT.replace("{text}", note.content)
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.1}},
            )
            resp.raise_for_status()
            raw: str = resp.json().get("response", "[]")
    except httpx.HTTPError:
        return []

    raw = raw.strip()
    if "```" in raw:
        raw = raw.split("```json")[1] if "```json" in raw else raw.split("```")[1]
        raw = raw.split("```")[0]

    start, end = raw.find("["), raw.rfind("]") + 1
    try:
        items = json.loads(raw[start:end]) if start != -1 else []
    except json.JSONDecodeError:
        items = []

    entries: list[LedgerEntry] = []
    for item in items:
        entry_type = item.get("entry_type")
        if entry_type not in VALID_ENTRY_TYPES:
            continue
        amount = item.get("amount")
        try:
            amount = int(amount) if amount is not None else None
        except (TypeError, ValueError):
            amount = None
        entry = LedgerEntry(
            id=str(uuid.uuid4()),
            note_id=note.id,
            project_id=note.project_id,
            entry_type=entry_type,
            person_name=(item.get("person_name") or None),
            item=(item.get("item") or None),
            amount=amount,
            occurred_at=note.note_date,
        )
        db.add(entry)
        entries.append(entry)

    if entries:
        await db.commit()
        for e in entries:
            await db.refresh(e)
    return entries


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/notes")
async def list_notes(
    project_id: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Note).order_by(Note.note_date.desc(), Note.created_at.desc())
    if project_id:
        stmt = stmt.where(Note.project_id == project_id)
    if category:
        stmt = stmt.where(Note.category == category)
    if date_from:
        stmt = stmt.where(Note.note_date >= date_from)
    if date_to:
        stmt = stmt.where(Note.note_date <= date_to)

    result = await db.execute(stmt)
    notes = result.scalars().all()

    entries_result = await db.execute(
        select(LedgerEntry).where(LedgerEntry.note_id.in_([n.id for n in notes]))
    )
    by_note: dict[str, list[dict]] = {}
    for e in entries_result.scalars().all():
        by_note.setdefault(e.note_id, []).append(_serialize_entry(e))

    return [{**_serialize_note(n), "ledger_entries": by_note.get(n.id, [])} for n in notes]


@router.post("/notes", status_code=201)
async def create_note(data: NoteCreate, db: AsyncSession = Depends(get_db)):
    category = data.category if data.category in VALID_CATEGORIES else "general"
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    note = Note(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        kind="text",
        category=category,
        content=content,
        note_date=data.note_date or datetime.utcnow(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    entries: list[LedgerEntry] = []
    if category in LEDGER_CATEGORIES:
        entries = await _extract_ledger(db, note)

    return {**_serialize_note(note), "ledger_entries": [_serialize_entry(e) for e in entries]}


@router.post("/notes/voice", status_code=201)
async def create_voice_note(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    category: str = Form("general"),
    note_date: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    category = category if category in VALID_CATEGORIES else "general"

    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text, _, no_speech = _transcribe_file(tmp_path, beam_size=5)
    finally:
        os.unlink(tmp_path)

    if no_speech or not text.strip():
        raise HTTPException(status_code=422, detail="No speech detected")

    parsed_date = None
    if note_date:
        try:
            parsed_date = datetime.fromisoformat(note_date)
        except ValueError:
            parsed_date = None

    note = Note(
        id=str(uuid.uuid4()),
        project_id=project_id,
        kind="voice",
        category=category,
        content=text.strip(),
        note_date=parsed_date or datetime.utcnow(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    entries: list[LedgerEntry] = []
    if category in LEDGER_CATEGORIES:
        entries = await _extract_ledger(db, note)

    return {**_serialize_note(note), "ledger_entries": [_serialize_entry(e) for e in entries]}


@router.patch("/notes/{note_id}")
async def update_note(note_id: str, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if data.project_id is not None:
        note.project_id = data.project_id
    if data.category is not None and data.category in VALID_CATEGORIES:
        note.category = data.category
    if data.content is not None:
        content = data.content.strip()
        if content:
            note.content = content
    if data.note_date is not None:
        note.note_date = data.note_date

    await db.commit()
    return _serialize_note(note)


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(LedgerEntry).where(LedgerEntry.note_id == note_id))
    await db.execute(delete(Note).where(Note.id == note_id))
    await db.commit()


@router.post("/notes/{note_id}/extract")
async def extract_note(note_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.execute(delete(LedgerEntry).where(LedgerEntry.note_id == note_id))
    await db.commit()

    entries = await _extract_ledger(db, note)
    return {"ledger_entries": [_serialize_entry(e) for e in entries]}
