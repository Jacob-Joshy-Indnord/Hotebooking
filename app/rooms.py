"""
File description: room management HTTP routes and schemas.

Schemas: RoomIn validates name, floor, capacity (>0) and equipment_tags; RoomOut
is the response. Functions: create_room (admin-only POST /rooms) validates tags
against the closed EquipmentTag vocabulary (422 on unknown tags), de-duplicates
them, and maps the database unique (floor, name) violation to 409 Conflict
with nothing stored; retire_room (admin-only POST /rooms/{id}/retire) in one
transaction marks the room retired and cancels Confirmed bookings starting
after now, setting notification_pending on each; in-progress bookings are left
untouched. Returns the cancelled count. Idempotent.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import require_role
from .db import get_db, utcnow
from .models import Booking, EquipmentTag, Room

router = APIRouter(prefix="/rooms", tags=["rooms"])


class RoomIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    floor: int
    capacity: int = Field(gt=0)
    equipment_tags: list[str] = []


class RoomOut(BaseModel):
    id: int
    name: str
    floor: int
    capacity: int
    retired: bool
    equipment_tags: list[str]


def _out(r: Room) -> RoomOut:
    return RoomOut(id=r.id, name=r.name, floor=r.floor, capacity=r.capacity,
                   retired=r.retired, equipment_tags=sorted(t.name for t in r.tags))


@router.post("", status_code=201, response_model=RoomOut, dependencies=[Depends(require_role("admin"))])
def create_room(body: RoomIn, db: Session = Depends(get_db)):
    names = set(body.equipment_tags)
    tags = db.query(EquipmentTag).filter(EquipmentTag.name.in_(names)).all() if names else []
    unknown = names - {t.name for t in tags}
    if unknown:
        raise HTTPException(422, f"Unknown equipment tags: {sorted(unknown)}")
    room = Room(name=body.name, floor=body.floor, capacity=body.capacity, tags=tags)
    db.add(room)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Room name already exists on this floor")
    return _out(room)


@router.post("/{room_id}/retire", dependencies=[Depends(require_role("admin"))])
def retire_room(room_id: int, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(404, "Room not found")
    now = utcnow()
    try:
        room.retired = True
        res = db.execute(
            update(Booking)
            .where(Booking.room_id == room_id, Booking.status == "Confirmed", Booking.start > now)
            .values(status="Cancelled", notification_pending=True)
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"room": _out(room), "cancelled_bookings": res.rowcount}
