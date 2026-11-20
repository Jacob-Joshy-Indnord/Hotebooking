# File: app/db.py
# Purpose: database plumbing for the RoomBook service. It builds the SQLAlchemy
# engine from the DATABASE_URL environment variable (SQLite by default, which is
# acceptable for v1; PostgreSQL works by changing the URL), and defines the
# declarative Base shared by all models. Functions and types: UTCDateTime, a
# column type that stores datetimes as UTC and always returns timezone-aware UTC
# values; make_engine(url), which creates an engine; and get_session(), a
# FastAPI dependency yielding a Session and closing it after the request.
# Tests override get_session to use an isolated in-memory database.
import os
from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.types import TypeDecorator
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetime not allowed; supply a timezone")
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc)


def make_engine(url: str | None = None):
    url = url or os.environ.get("DATABASE_URL", "sqlite:///./roombook.db")
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if ":memory:" in url or url == "sqlite://":
            kwargs["poolclass"] = StaticPool
        return create_engine(url, **kwargs)
    return create_engine(url)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
