"""
File description: shared pytest fixtures.

Fixtures: client builds a TestClient against a fresh in-memory SQLite database
(StaticPool) with the get_db dependency overridden and the tag vocabulary
seeded; admin_h and staff_h return X-API-Key header dicts for an admin and a
staff user created in that database; db gives a direct session for assertions.
Helper make_user(session, role, key) inserts a user with a hashed API key.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import hash_key
from app.db import get_db, init_db
from app.main import create_app
from app.models import User


def make_user(s, role, key):
    u = User(name=role, role=role, api_key_hash=hash_key(key))
    s.add(u)
    s.commit()
    return u


@pytest.fixture
def db():
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    init_db(eng)
    Session = sessionmaker(bind=eng, expire_on_commit=False)
    with Session() as s:
        make_user(s, "admin", "admin-key")
        make_user(s, "staff", "staff-key")
    s = Session()
    s.Session = Session
    yield s
    s.close()


@pytest.fixture
def client(db):
    app = create_app()

    def override():
        with db.Session() as s:
            yield s

    app.dependency_overrides[get_db] = override
    return TestClient(app)


@pytest.fixture
def admin_h():
    return {"X-API-Key": "admin-key"}


@pytest.fixture
def staff_h():
    return {"X-API-Key": "staff-key"}
