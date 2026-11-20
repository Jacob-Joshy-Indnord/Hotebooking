# File: app/auth.py
# Purpose: API-key authentication and role checks for RoomBook. Each key maps
# to exactly one user and role; keys are stored hashed. Functions:
# current_user(), a FastAPI dependency that reads the key from the X-API-Key
# header, hashes it and looks the user up, returning 401 when the key is
# missing or unknown; and require_admin(), a dependency built on current_user
# that returns 403 when the caller is not an admin. The header name is an
# open question in the design document; X-API-Key is assumed and isolated
# here so it is trivial to change.
from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Role, User, hash_key


def current_user(
    x_api_key: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="missing API key")
    user = session.scalar(select(User).where(User.api_key_hash == hash_key(x_api_key)))
    if user is None:
        raise HTTPException(status_code=401, detail="invalid API key")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="admin only")
    return user
