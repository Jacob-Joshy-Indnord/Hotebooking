"""
File description: tests for room data model, create-room and retire-room.

Covers: unique (floor, name) giving 409 and no stored duplicate; same name on
another floor allowed; admin create returns id and stored values; staff gets
403 and no key gets 401; closed tag vocabulary rejects unknown tags with 422;
retirement cancels only Confirmed bookings starting after now and sets
notification_pending, leaving in-progress and past bookings untouched; retired
room rejects new bookings; retirement is admin-only and 404 for unknown rooms.
"""
from datetime import timedelta

from app.db import utcnow
from app.models import Booking, Room

BODY = {"name": "Atlas", "floor": 1, "capacity": 8, "equipment_tags": ["projector", "whiteboard"]}


def test_duplicate_name_same_floor_conflict(client, admin_h, db):
    assert client.post("/rooms", json=BODY, headers=admin_h).status_code == 201
    r = client.post("/rooms", json=BODY, headers=admin_h)
    assert r.status_code == 409
    assert db.query(Room).count() == 1


def test_same_name_other_floor_ok(client, admin_h):
    client.post("/rooms", json=BODY, headers=admin_h)
    assert client.post("/rooms", json={**BODY, "floor": 2}, headers=admin_h).status_code == 201


def test_admin_creates_room(client, admin_h):
    r = client.post("/rooms", json=BODY, headers=admin_h)
    assert r.status_code == 201
    d = r.json()
    assert d["id"] and d["name"] == "Atlas" and d["floor"] == 1 and d["capacity"] == 8
    assert d["equipment_tags"] == ["projector", "whiteboard"] and d["retired"] is False


def test_staff_forbidden_and_unauthenticated(client, staff_h):
    assert client.post("/rooms", json=BODY, headers=staff_h).status_code == 403
    assert client.post("/rooms", json=BODY).status_code == 401


def test_unknown_tag_rejected(client, admin_h, db):
    r = client.post("/rooms", json={**BODY, "equipment_tags": ["jacuzzi"]}, headers=admin_h)
    assert r.status_code == 422
    assert db.query(Room).count() == 0


def _book(db, room_id, start, end, status="Confirmed"):
    b = Booking(room_id=room_id, owner_id=2, title="t", start=start, end=end, status=status)
    db.add(b)
    db.commit()
    return b.id


def test_retire_cancels_future_only(client, admin_h, db):
    rid = client.post("/rooms", json=BODY, headers=admin_h).json()["id"]
    now = utcnow()
    fut = _book(db, rid, now + timedelta(days=1), now + timedelta(days=1, hours=1))
    cur = _book(db, rid, now - timedelta(minutes=30), now + timedelta(minutes=30))
    past = _book(db, rid, now - timedelta(days=1), now - timedelta(days=1) + timedelta(hours=1))
    r = client.post(f"/rooms/{rid}/retire", headers=admin_h)
    assert r.status_code == 200 and r.json()["cancelled_bookings"] == 1
    db.expire_all()
    f, c, p = (db.get(Booking, i) for i in (fut, cur, past))
    assert (f.status, f.notification_pending) == ("Cancelled", True)
    assert (c.status, c.notification_pending) == ("Confirmed", False)
    assert (p.status, p.notification_pending) == ("Confirmed", False)
    assert db.get(Room, rid).retired is True


def test_booking_on_retired_room_rejected(client, admin_h, staff_h):
    rid = client.post("/rooms", json=BODY, headers=admin_h).json()["id"]
    now = utcnow()
    payload = {"room_id": rid, "title": "x", "start": (now + timedelta(days=1)).isoformat(),
               "end": (now + timedelta(days=1, hours=1)).isoformat()}
    assert client.post("/bookings", json=payload, headers=staff_h).status_code == 201
    client.post(f"/rooms/{rid}/retire", headers=admin_h)
    assert client.post("/bookings", json=payload, headers=staff_h).status_code == 409


def test_retire_admin_only_and_404(client, admin_h, staff_h):
    rid = client.post("/rooms", json=BODY, headers=admin_h).json()["id"]
    assert client.post(f"/rooms/{rid}/retire", headers=staff_h).status_code == 403
    assert client.post("/rooms/999/retire", headers=admin_h).status_code == 404
