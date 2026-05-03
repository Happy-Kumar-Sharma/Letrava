"""FastAPI entrypoint — wires routes, CORS, and custom JWT auth."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routes import auth_routes, comments, follows, letters, me, notifications, prompts, reactions, saves, search

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title="Letrava API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})

    app.include_router(auth_routes.router)
    app.include_router(me.router)
    app.include_router(letters.router)
    app.include_router(reactions.router)
    app.include_router(comments.router)
    app.include_router(follows.router)
    app.include_router(saves.router)
    app.include_router(prompts.router)
    app.include_router(search.router)
    app.include_router(notifications.router)

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    return app


app = create_app()
