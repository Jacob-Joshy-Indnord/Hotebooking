"""
File description: database plumbing for RoomBook.

Defines the SQLAlchemy declarative Base, the engine/session factory and helpers.
Functions: utcnow() returns the current UTC time as a naive datetime, because
SQLite drops tzinfo and all stored times are UTC; to_utc(dt) normalises any
datetime to naive UTC; get_db() is the FastAPI dependency yielding one session
per request; init_db() creates tables and seeds the closed equipment-tag
vocabulary (projector, whiteboard, video-conf). The database URL comes from the
ROOMBOOK_DB_URL environment variable and defaults to a local SQLite file.
"""
import os
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_URL = os.environ.get("ROOMBOOK_DB_URL", "sqlite:///roombook.db")
ALLOWED_TAGS = ("projector", "whiteboard", "video-conf")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(bind=None) -> None:
    from . import models

    bind = bind or engine
    Base.metadata.create_all(bind)
    with sessionmaker(bind=bind)() as s:
        have = {t.name for t in s.query(models.EquipmentTag).all()}
        s.add_all(models.EquipmentTag(name=n) for n in ALLOWED_TAGS if n not in have)
        s.commit()
