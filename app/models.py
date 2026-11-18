"""
File description: SQLAlchemy ORM models for RoomBook's room management epic.

Classes: User (id, name, role of 'staff' or 'admin', sha256-hashed api_key);
EquipmentTag (closed-vocabulary lookup table of allowed tag names); Room (name,
floor, capacity, retired flag, many-to-many equipment tags, with a database
UniqueConstraint on (floor, name) so names are unique per floor); Booking
(minimal booking row: room, owner, start/end in UTC, status, and a persisted
notification_pending flag set when retirement cancels it). room_equipment is
the association table joining rooms to tags.
"""
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Table, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

room_equipment = Table(
    "room_equipment", Base.metadata,
    Column("room_id", ForeignKey("rooms.id"), primary_key=True),
    Column("tag_id", ForeignKey("equipment_tags.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(10))  # "staff" | "admin"
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True)


class EquipmentTag(Base):
    __tablename__ = "equipment_tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (UniqueConstraint("floor", "name", name="uq_room_floor_name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    floor: Mapped[int] = mapped_column(Integer)
    capacity: Mapped[int] = mapped_column(Integer)
    retired: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list[EquipmentTag]] = relationship(secondary=room_equipment, lazy="selectin")


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    start: Mapped["DateTime"] = mapped_column(DateTime)
    end: Mapped["DateTime"] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="Confirmed")
    notification_pending: Mapped[bool] = mapped_column(Boolean, default=False)
