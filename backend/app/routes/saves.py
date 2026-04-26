"""/api/saves — viewer's saved letters; /api/letters/{id}/save — save toggle."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..db import get_db
from ..models import Letter, Save, User
from ..schemas import LetterOut
from ..serializers import letter_to_dict

router = APIRouter(tags=["saves"])


@router.get("/api/saves", response_model=list[LetterOut])
def list_saves(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    stmt = (
        select(Letter)
        .options(selectinload(Letter.author))
        .join(Save, Save.letter_id == Letter.id)
        .where(Save.user_id == user.id)
        .order_by(Save.created_at.desc())
    )
    letters = db.scalars(stmt).all()
    return [letter_to_dict(db, lt, user.id) for lt in letters]


@router.post("/api/letters/{letter_id}/save", status_code=status.HTTP_200_OK)
def save_letter(
    letter_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not db.get(Letter, letter_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    existing = db.scalar(
        select(Save).where(Save.user_id == user.id, Save.letter_id == letter_id)
    )
    if not existing:
        db.add(Save(user_id=user.id, letter_id=letter_id))
        db.commit()
    return {"saved": True}


@router.delete("/api/letters/{letter_id}/save", status_code=status.HTTP_200_OK)
def unsave_letter(
    letter_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    existing = db.scalar(
        select(Save).where(Save.user_id == user.id, Save.letter_id == letter_id)
    )
    if existing:
        db.delete(existing)
        db.commit()
    return {"saved": False}
