"""
File description: FastAPI application entry point for RoomBook.

Function: create_app() builds the FastAPI app, includes the rooms and bookings
routers and initialises the database (tables plus seeded equipment-tag
vocabulary) on startup via the lifespan hook. The module-level `app` is what
uvicorn serves (uvicorn app.main:app). OpenAPI docs are available at /docs.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import bookings, rooms
from .db import init_db


@asynccontextmanager
async def lifespan(_):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="RoomBook", lifespan=lifespan)
    app.include_router(rooms.router)
    app.include_router(bookings.router)
    return app


app = create_app()
