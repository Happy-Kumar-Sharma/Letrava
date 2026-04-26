"""/api/prompts/current — the active weekly prompt (if any)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import WeeklyPrompt
from ..schemas import WeeklyPromptOut

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("/current", response_model=WeeklyPromptOut)
def current_prompt(db: Session = Depends(get_db)) -> WeeklyPromptOut:
    p = db.scalar(
        select(WeeklyPrompt).where(WeeklyPrompt.active.is_(True)).order_by(WeeklyPrompt.week_start.desc())
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active prompt")
    return WeeklyPromptOut(id=p.id, prompt=p.prompt, week_start=p.week_start)
