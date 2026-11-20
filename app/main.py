# File: app/main.py
# Purpose: FastAPI application entry point for RoomBook. create_app() builds
# the app, creates database tables on startup, and mounts the routers for the
# my-bookings endpoint (app/bookings.py) and the utilisation report endpoint
# (app/reports.py). The module-level `app` object is what uvicorn serves
# (uvicorn app.main:app). Other epics (rooms, availability, booking creation,
# check-in and the APScheduler release job) register their routers here as
# they land. The lifespan hook is the place to start and stop the scheduler.
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import bookings, reports
from app.db import Base, engine


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    application = FastAPI(title="RoomBook", lifespan=lifespan)
    application.include_router(bookings.router)
    application.include_router(reports.router)
    return application


app = create_app()
