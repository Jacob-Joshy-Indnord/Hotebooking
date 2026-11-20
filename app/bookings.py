# File: app/bookings.py
# Purpose: booking read endpoints for RoomBook. Provides the router with
# GET /bookings/mine (task-9GMFHlrBT5k), which returns only the caller's own
# bookings with their status. Ordering (confirmed with the manager): future
# bookings first, ascending by start; then past bookings, most recent start
# first. A booking is "upcoming" when its start is at or after now. Functions:
# list_my_bookings(), the route handler, and order_my_bookings(), a pure
# helper that applies the ordering to a list of bookings given the current
# time so it can be unit tested. Also defines the BookingOut response model.
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_session
from app.models import Booking, User

router = APIRouter()


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    title: str
    attendees: int
    start: datetime
    end: datetime
    status: str
    checked_in_at: datetime | None = None


def order_my_bookings(bookings: list[Booking], now: datetime) -> list[Booking]:
    upcoming = sorted((b for b in bookings if b.start >= now), key=lambda b: b.start)
    past = sorted((b for b in bookings if b.start < now), key=lambda b: b.start, reverse=True)
    return upcoming + past


@router.get("/bookings/mine", response_model=list[BookingOut])
def list_my_bookings(
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    rows = session.scalars(select(Booking).where(Booking.user_id == user.id)).all()
    return order_my_bookings(list(rows), datetime.now(timezone.utc))
