import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey
from database import Base


class Vault(Base):
    __tablename__ = "vault"

    id           = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    title        = Column(String(200), nullable=False)       # Gmail, GitHub, …
    username     = Column(String(300), nullable=True)        # email / username (plain)
    password_enc = Column(Text,        nullable=False)       # AES-encrypted password
    url          = Column(String(500), nullable=True)        # https://…
    notes        = Column(Text,        nullable=True)        # plain-text hints
    category     = Column(String(50),  nullable=False, default="other")
    created_at   = Column(DateTime,    nullable=False, default=datetime.utcnow)
    updated_at   = Column(DateTime,    nullable=False, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="todo")   # todo | in_progress | done
    priority = Column(String(10), nullable=False, default="medium")  # low | medium | high
    source_text = Column(Text, nullable=True)   # original transcription that produced this task
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"

    id         = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String(200), nullable=False)
    archived   = Column(Boolean,     nullable=False, default=False)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)


class Note(Base):
    __tablename__ = "notes"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    kind       = Column(String(10), nullable=False, default="text")      # text | voice
    category   = Column(String(20), nullable=False, default="general")   # general|site_log|labor|purchase|expense|reminder
    content    = Column(Text,       nullable=False)
    note_date  = Column(DateTime,   nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime,   nullable=False, default=datetime.utcnow)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    note_id     = Column(String(36), ForeignKey("notes.id"), nullable=False)
    project_id  = Column(String(36), ForeignKey("projects.id"), nullable=True)
    entry_type  = Column(String(20), nullable=False)   # labor_payment | purchase | expense | income | other
    person_name = Column(String(200), nullable=True)
    item        = Column(String(300), nullable=True)
    amount      = Column(Integer, nullable=True)        # تومان
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
