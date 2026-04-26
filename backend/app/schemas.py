from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


ReactionKind = Literal["like", "thoughtful", "relatable", "sad", "hopeful", "inspiring"]
Palette = Literal["indigo", "coral", "teal", "violet", "amber"]


class AuthorOut(BaseModel):
    id: uuid.UUID
    name: str
    palette: str

    model_config = {"from_attributes": True}


class UserInit(BaseModel):
    username: str = Field(min_length=2, max_length=40)
    palette: Palette = "indigo"
    bio: str = ""


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    palette: str
    bio: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    palette: str
    bio: str
    letters_count: int
    followers_count: int
    following_count: int
    is_following: bool = False


class LetterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=5)
    mood: Optional[str] = None


class LetterOut(BaseModel):
    id: int
    title: str
    body: str
    excerpt: str
    tags: list[str]
    mood: Optional[str]
    age: str
    read_time: str
    created_at: datetime
    author: AuthorOut
    reactions: int
    comments: int
    saves: int
    saved: bool = False
    my_reaction: Optional[str] = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    parent_id: Optional[int] = None


class CommentOut(BaseModel):
    id: int
    body: str
    age: str
    created_at: datetime
    author: AuthorOut
    parent_id: Optional[int]
    replies: list["CommentOut"] = Field(default_factory=list)


class ReactionIn(BaseModel):
    kind: Optional[ReactionKind] = None  # null clears


class WeeklyPromptOut(BaseModel):
    id: int
    prompt: str
    week_start: datetime


class FollowOut(BaseModel):
    is_following: bool
    followers_count: int
