import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime
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
