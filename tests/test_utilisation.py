# File: tests/test_utilisation.py
# Purpose: acceptance tests for GET /reports/utilisation (task-ijkX5HfAyEs).
# test_per_room_metrics checks booked hours, released hours and booking count
# per room, and that Cancelled bookings are excluded. test_released_counts_
# unused_remainder checks a Released booking contributes its slot minus the
# first 15 minutes. test_boundary_clipping checks bookings straddling the
# range edges count only overlapping hours. test_staff_forbidden checks 403
# for staff and 401 without a key. test_invalid_range checks end before start
# is rejected with 422.
from datetime import datetime, timezone

H = "X-API-Key"


def dt(day, hour, minute=0):
    return datetime(2030, 1, day, hour, minute, tzinfo=timezone.utc)


def by_room(body):
    return {r["room_id"]: r for r in body}


def test_per_room_metrics(client, make_user, make_room, make_booking):
    admin, key = make_user("adm", "admin")
    u, _ = make_user()
    r1, r2, r3 = make_room(), make_room(), make_room()
    make_booking(r1, u, dt(10, 9), dt(10, 11))
    make_booking(r1, u, dt(11, 9), dt(11, 10))
    make_booking(r1, u, dt(12, 9), dt(12, 10), "Cancelled")
    make_booking(r2, u, dt(10, 9), dt(10, 10), "Released")
    resp = client.get("/reports/utilisation?start_date=2030-01-10&end_date=2030-01-12", headers={H: key})
    assert resp.status_code == 200
    m = by_room(resp.json())
    assert (m[r1.id]["booked_hours"], m[r1.id]["released_hours"], m[r1.id]["booking_count"]) == (3, 0, 2)
    assert (m[r2.id]["booked_hours"], m[r2.id]["released_hours"], m[r2.id]["booking_count"]) == (0, 0.75, 1)
    assert (m[r3.id]["booked_hours"], m[r3.id]["booking_count"]) == (0, 0)


def test_released_counts_unused_remainder(client, make_user, make_room, make_booking):
    admin, key = make_user("adm", "admin")
    u, _ = make_user()
    r = make_room()
    make_booking(r, u, dt(10, 9), dt(10, 11), "Released")
    body = client.get("/reports/utilisation?start_date=2030-01-10&end_date=2030-01-10", headers={H: key}).json()
    assert by_room(body)[r.id]["released_hours"] == 1.75


def test_boundary_clipping(client, make_user, make_room, make_booking):
    admin, key = make_user("adm", "admin")
    u, _ = make_user()
    r = make_room()
    make_booking(r, u, dt(9, 23), dt(10, 2))    # 2h inside range
    make_booking(r, u, dt(10, 23), dt(11, 3))   # 1h inside range
    make_booking(r, u, dt(8, 9), dt(8, 10))     # outside
    body = client.get("/reports/utilisation?start_date=2030-01-10&end_date=2030-01-10", headers={H: key}).json()
    row = by_room(body)[r.id]
    assert row["booked_hours"] == 3
    assert row["booking_count"] == 2


def test_staff_forbidden(client, make_user):
    _, key = make_user("s", "staff")
    url = "/reports/utilisation?start_date=2030-01-10&end_date=2030-01-10"
    assert client.get(url, headers={H: key}).status_code == 403
    assert client.get(url).status_code == 401


def test_invalid_range(client, make_user):
    _, key = make_user("adm", "admin")
    r = client.get("/reports/utilisation?start_date=2030-01-11&end_date=2030-01-10", headers={H: key})
    assert r.status_code == 422
