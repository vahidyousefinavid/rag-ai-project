import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Vault
from vault_crypto import encrypt, decrypt

router = APIRouter()

VALID_CATEGORIES = {"email", "social", "work", "finance", "shopping", "other"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class VaultCreate(BaseModel):
    title: str
    username: Optional[str] = None
    password: str
    url: Optional[str] = None
    notes: Optional[str] = None
    category: str = "other"


class VaultUpdate(BaseModel):
    title: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None   # empty = keep current
    url: Optional[str] = None
    notes: Optional[str] = None
    category: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(v: Vault) -> dict:
    return {
        "id":         v.id,
        "title":      v.title,
        "username":   v.username,
        "url":        v.url,
        "notes":      v.notes,
        "category":   v.category,
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "updated_at": v.updated_at.isoformat() if v.updated_at else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/vault")
async def list_vault(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vault).order_by(Vault.created_at.desc()))
    return [_serialize(v) for v in result.scalars().all()]


@router.post("/vault", status_code=201)
async def create_vault(data: VaultCreate, db: AsyncSession = Depends(get_db)):
    entry = Vault(
        id=str(uuid.uuid4()),
        title=data.title.strip(),
        username=data.username or None,
        password_enc=encrypt(data.password),
        url=data.url or None,
        notes=data.notes or None,
        category=data.category if data.category in VALID_CATEGORIES else "other",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _serialize(entry)


@router.get("/vault/{vault_id}/reveal")
async def reveal_password(vault_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vault).where(Vault.id == vault_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    return {"password": decrypt(entry.password_enc)}


@router.patch("/vault/{vault_id}")
async def update_vault(vault_id: str, data: VaultUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vault).where(Vault.id == vault_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")

    if data.title is not None:
        entry.title = data.title.strip()
    if data.username is not None:
        entry.username = data.username or None
    if data.password:
        entry.password_enc = encrypt(data.password)
    if data.url is not None:
        entry.url = data.url or None
    if data.notes is not None:
        entry.notes = data.notes or None
    if data.category and data.category in VALID_CATEGORIES:
        entry.category = data.category
    entry.updated_at = datetime.utcnow()

    await db.commit()
    return _serialize(entry)


@router.delete("/vault/{vault_id}", status_code=204)
async def delete_vault(vault_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Vault).where(Vault.id == vault_id))
    await db.commit()
