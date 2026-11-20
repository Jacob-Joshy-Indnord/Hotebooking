# File: app/reports.py
# Purpose: admin utilisation report for RoomBook (task-ijkX5HfAyEs). Provides
# GET /reports/utilisation?start_date=&end_date= (inclusive dates, UTC),
# restricted to admins. Per room it returns booked_hours, released_hours and
# booking_count. Confirmed bookings count as booked hours; for Released
# bookings the unused remainder (from start + 15 minutes to end) counts as
# released hours; Cancelled bookings are excluded. Bookings straddling the
# range boundary are clipped to the range. Functions: utilisation_report(),
# the handler; clip_hours(), which returns overlap hours of an interval with
# the range; and released_interval(), which gives the unused part of a slot.
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_session
from app.models import Booking, BookingStatus, Room, User

router = APIRouter()
NO_SHOW_GRACE = timedelta(minutes=15)


class RoomUtilisation(BaseModel):
    room_id: int
    room_name: str
    floor: int
    booked_hours: float
    released_hours: float
    booking_count: int


def clip_hours(start: datetime, end: datetime, range_start: datetime, range_end: datetime) -> float:
    lo, hi = max(start, range_start), min(end, range_end)
    return max((hi - lo).total_seconds(), 0) / 3600


def released_interval(b: Booking) -> tuple[datetime, datetime]:
    return min(b.start + NO_SHOW_GRACE, b.end), b.end


@router.get("/reports/utilisation", response_model=list[RoomUtilisation])
def utilisation_report(
    start_date: date,
    end_date: date,
    _admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="end_date before start_date")
    range_start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    range_end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)

    rooms = session.scalars(select(Room).order_by(Room.floor, Room.name)).all()
    stats = {r.id: RoomUtilisation(room_id=r.id, room_name=r.name, floor=r.floor,
                                   booked_hours=0, released_hours=0, booking_count=0)
             for r in rooms}
    bookings = session.scalars(
        select(Booking).where(
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.RELEASED]),
            Booking.start < range_end,
            Booking.end > range_start,
        )
    ).all()
    for b in bookings:
        s = stats[b.room_id]
        s.booking_count += 1
        if b.status == BookingStatus.CONFIRMED:
            s.booked_hours += clip_hours(b.start, b.end, range_start, range_end)
        else:
            lo, hi = released_interval(b)
            s.released_hours += clip_hours(lo, hi, range_start, range_end)
    for s in stats.values():
        s.booked_hours = round(s.booked_hours, 4)
        s.released_hours = round(s.released_hours, 4)
    return list(stats.values())
