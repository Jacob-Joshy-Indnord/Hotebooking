# File: tests/test_my_bookings.py
# Purpose: acceptance tests for GET /bookings/mine (task-9GMFHlrBT5k).
# test_own_bookings_only checks that another user's bookings never appear.
# test_upcoming_first_with_status checks that future bookings come first in
# ascending start order, followed by past bookings most recent first, and
# that every item carries its status (including Cancelled and Released).
# test_requires_api_key checks that a missing key is rejected with 401.
from datetime import datetime, timedelta, timezone

H = "X-API-Key"


def now():
    return datetime.now(timezone.utc).replace(microsecond=0)


def test_own_bookings_only(client, make_user, make_room, make_booking):
    a, ka = make_user("a")
    b, _ = make_user("b")
    room = make_room()
    mine = make_booking(room, a, now() + timedelta(days=1), now() + timedelta(days=1, hours=1))
    make_booking(room, b, now() + timedelta(days=2), now() + timedelta(days=2, hours=1))
    r = client.get("/bookings/mine", headers={H: ka})
    assert r.status_code == 200
    assert [x["id"] for x in r.json()] == [mine.id]


def test_upcoming_first_with_status(client, make_user, make_room, make_booking):
    a, ka = make_user("a")
    room = make_room()
    n = now()
    p_old = make_booking(room, a, n - timedelta(days=3), n - timedelta(days=3) + timedelta(hours=1), "Released")
    p_new = make_booking(room, a, n - timedelta(days=1), n - timedelta(days=1) + timedelta(hours=1))
    f_late = make_booking(room, a, n + timedelta(days=5), n + timedelta(days=5, hours=1))
    f_soon = make_booking(room, a, n + timedelta(days=1), n + timedelta(days=1, hours=1), "Cancelled")
    body = client.get("/bookings/mine", headers={H: ka}).json()
    assert [x["id"] for x in body] == [f_soon.id, f_late.id, p_new.id, p_old.id]
    assert [x["status"] for x in body] == ["Cancelled", "Confirmed", "Confirmed", "Released"]
    assert body[0]["start"].endswith("Z") or "+00:00" in body[0]["start"]


def test_requires_api_key(client):
    assert client.get("/bookings/mine").status_code == 401
    assert client.get("/bookings/mine", headers={H: "nope"}).status_code == 401
