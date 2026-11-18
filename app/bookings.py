"""
File description: minimal booking route, only enough to enforce the retired-room rule.

Function: create_booking (POST /bookings, any authenticated user) creates a
Confirmed booking and rejects with 409 when the room is retired, 404 when the
room does not exist, and 422 when end is not after start. Times are normalised
to UTC. The full booking rules (increments, overlap, capacity, limits) belong
to the Bookings epic and are deliberately not implemented here.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import current_user
from .db import get_db, to_utc
from .models import Booking, Room, User

router = APIRouter(prefix="/bookings", tags=["bookings"])


class BookingIn(BaseModel):
    room_id: int
    title: str
    start: datetime
    end: datetime


@router.post("", status_code=201)
def create_booking(body: BookingIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    room = db.get(Room, body.room_id)
    if room is None:
        raise HTTPException(404, "Room not found")
    if room.retired:
        raise HTTPException(409, "Room is retired and accepts no new bookings")
    start, end = to_utc(body.start), to_utc(body.end)
    if end <= start:
        raise HTTPException(422, "end must be after start")
    b = Booking(room_id=room.id, owner_id=user.id, title=body.title, start=start, end=end)
    db.add(b)
    db.commit()
    return {"id": b.id, "status": b.status, "start": b.start.isoformat() + "Z", "end": b.end.isoformat() + "Z"}
