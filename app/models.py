# File: app/models.py
# Purpose: SQLAlchemy data model for RoomBook. Defines three tables. User holds
# a name, a role (staff or admin) and the SHA-256 hash of that user's API key,
# never the plain key. Room holds name, floor, capacity and a retired flag,
# with a database-enforced unique (floor, name). Booking links a room and a
# user with title, attendee count, UTC start and end, a status (Confirmed,
# Cancelled or Released) and an optional check-in time. Also exposes the
# Role and BookingStatus string constants and hash_key(), which hashes an API
# key for storage and lookup. All times are stored in UTC.
import hashlib
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime


class Role:
    STAFF = "staff"
    ADMIN = "admin"


class BookingStatus:
    CONFIRMED = "Confirmed"
    CANCELLED = "Cancelled"
    RELEASED = "Released"


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(10))
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True)


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (UniqueConstraint("floor", "name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    floor: Mapped[int]
    capacity: Mapped[int]
    retired: Mapped[bool] = mapped_column(default=False)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        Index("ix_bookings_room_time", "room_id", "start", "end"),
        Index("ix_bookings_user_start", "user_id", "start"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    attendees: Mapped[int]
    start: Mapped[datetime] = mapped_column(UTCDateTime)
    end: Mapped[datetime] = mapped_column(UTCDateTime)
    status: Mapped[str] = mapped_column(String(10), default=BookingStatus.CONFIRMED)
    checked_in_at: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None)

    room: Mapped[Room] = relationship()
