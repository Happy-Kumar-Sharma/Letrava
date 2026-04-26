"""/api/letters/{id}/reactions — set/clear the viewer's reaction.

One row per (user, letter). PUT with {"kind": ...} upserts; PUT with {"kind": null}
or DELETE clears.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Letter, Reaction, User
from ..schemas import ReactionIn

router = APIRouter(prefix="/api/letters/{letter_id}/reactions", tags=["reactions"])


@router.put("", status_code=status.HTTP_200_OK)
def set_reaction(
    letter_id: int,
    body: ReactionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not db.get(Letter, letter_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")

    existing = db.scalar(
        select(Reaction).where(Reaction.letter_id == letter_id, Reaction.user_id == user.id)
    )
    if body.kind is None:
        if existing:
            db.delete(existing)
            db.commit()
        return {"kind": None}

    if existing:
        existing.kind = body.kind
    else:
        db.add(Reaction(user_id=user.id, letter_id=letter_id, kind=body.kind))
    db.commit()
    return {"kind": body.kind}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_reaction(
    letter_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    existing = db.scalar(
        select(Reaction).where(Reaction.letter_id == letter_id, Reaction.user_id == user.id)
    )
    if existing:
        db.delete(existing)
        db.commit()
