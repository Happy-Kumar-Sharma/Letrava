"""FastAPI entrypoint — wires routes, CORS, and Supabase Auth bearer."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import comments, follows, letters, me, prompts, reactions, saves


def create_app() -> FastAPI:
    app = FastAPI(title="Letrava API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(me.router)
    app.include_router(letters.router)
    app.include_router(reactions.router)
    app.include_router(comments.router)
    app.include_router(follows.router)
    app.include_router(saves.router)
    app.include_router(prompts.router)

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    return app


app = create_app()
