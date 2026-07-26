import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Project

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    archived: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "archived": p.archived,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at))
    return [_serialize(p) for p in result.scalars().all()]


@router.post("/projects", status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    project = Project(id=str(uuid.uuid4()), name=name)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return _serialize(project)


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        name = data.name.strip()
        if name:
            project.name = name
    if data.archived is not None:
        project.archived = data.archived

    await db.commit()
    return _serialize(project)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project:
        await db.delete(project)
        await db.commit()
