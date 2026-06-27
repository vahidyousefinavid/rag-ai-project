import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Task

router = APIRouter()

VALID_STATUSES   = {"todo", "in_progress", "done"}
VALID_PRIORITIES = {"low", "medium", "high"}


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    source_text: Optional[str] = None
    order: int = 0


class TaskBulkCreate(BaseModel):
    tasks: list[dict]
    source_text: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    order: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(t: Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "order": t.order,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/tasks")
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task).order_by(Task.status, Task.order, Task.created_at)
    )
    return [_serialize(t) for t in result.scalars().all()]


@router.post("/tasks", status_code=201)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(
        id=str(uuid.uuid4()),
        title=data.title.strip(),
        description=data.description,
        status=data.status if data.status in VALID_STATUSES else "todo",
        priority=data.priority if data.priority in VALID_PRIORITIES else "medium",
        source_text=data.source_text,
        order=data.order,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _serialize(task)


@router.post("/tasks/bulk", status_code=201)
async def create_tasks_bulk(data: TaskBulkCreate, db: AsyncSession = Depends(get_db)):
    created = []
    for i, item in enumerate(data.tasks):
        task = Task(
            id=str(uuid.uuid4()),
            title=str(item.get("title", "")).strip()[:200],
            description=item.get("description"),
            status="todo",
            priority=item.get("priority", "medium") if item.get("priority") in VALID_PRIORITIES else "medium",
            source_text=data.source_text,
            order=i,
        )
        db.add(task)
        created.append(task)
    await db.commit()
    return {"created": len(created)}


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.title is not None:
        task.title = data.title.strip()[:200]
    if data.description is not None:
        task.description = data.description
    if data.status is not None and data.status in VALID_STATUSES:
        task.status = data.status
    if data.priority is not None and data.priority in VALID_PRIORITIES:
        task.priority = data.priority
    if data.order is not None:
        task.order = data.order

    await db.commit()
    return _serialize(task)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Task).where(Task.id == task_id))
    await db.commit()
