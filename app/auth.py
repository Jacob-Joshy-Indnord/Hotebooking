"""
File description: API-key authentication and role enforcement.

Functions: hash_key(key) returns the sha256 hex digest used to store keys (keys
are never kept in plain text); current_user(x_api_key, db) is a FastAPI
dependency that reads the X-API-Key header and returns the matching User, or
raises 401 when missing/invalid; require_role(role) builds a dependency that
additionally raises 403 when the user's role differs from the one required.
The header name X-API-Key is an assumption (design open question).
"""
import hashlib

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models import User


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def current_user(x_api_key: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter_by(api_key_hash=hash_key(x_api_key)).first() if x_api_key else None
    if user is None:
        raise HTTPException(401, "Invalid or missing API key")
    return user


def require_role(role: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role != role:
            raise HTTPException(403, f"{role} role required")
        return user
    return dep
