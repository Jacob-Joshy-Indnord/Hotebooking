# File: tests/conftest.py
# Purpose: shared pytest fixtures for RoomBook tests. `session_factory`
# builds an isolated in-memory SQLite database per test with all tables
# created. `client` returns a FastAPI TestClient whose get_session
# dependency uses that database. `make_user(name, role)` inserts a user and
# returns (user, api_key) so tests can send X-API-Key headers. `make_room`
# inserts a room. `make_booking` inserts a booking with given UTC times and
# status. Helpers keep each test small and independent of other epics'
# endpoints, which may not exist yet.
import itertools
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_session, make_engine
from app.main import create_app
from app.models import Booking, Room, User, hash_key


@pytest.fixture
def session_factory():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture
def client(session_factory):
    app = create_app()

    def _get_session():
        s = session_factory()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_session] = _get_session
    return TestClient(app)


_ids = itertools.count(1)


@pytest.fixture
def make_user(session_factory):
    def _make(name="u", role="staff"):
        key = f"key-{next(_ids)}"
        with session_factory() as s:
            u = User(name=name, role=role, api_key_hash=hash_key(key))
            s.add(u)
            s.commit()
            return u, key
    return _make


@pytest.fixture
def make_room(session_factory):
    def _make(name=None, floor=1, capacity=10):
        with session_factory() as s:
            r = Room(name=name or f"R{next(_ids)}", floor=floor, capacity=capacity)
            s.add(r)
            s.commit()
            return r
    return _make


@pytest.fixture
def make_booking(session_factory):
    def _make(room, user, start, end, status="Confirmed"):
        with session_factory() as s:
            b = Booking(room_id=room.id, user_id=user.id, title="t", attendees=2,
                        start=start, end=end, status=status)
            s.add(b)
            s.commit()
            return b
    return _make
