import re
from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field, field_validator


ReactionKind = Literal["like", "thoughtful", "relatable", "sad", "hopeful", "inspiring"]
Palette = Literal["indigo", "coral", "teal", "violet", "amber"]

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,40}$")


class SignupIn(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    password: str = Field(..., min_length=8, max_length=128)
    username: str
    palette: Palette = "indigo"
    bio: str = ""

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not _USERNAME_RE.match(v):
            raise ValueError("Username must be 3–40 characters: letters, digits, underscores only")
        return v.lower()


class SigninIn(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    palette: Optional[Palette] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None  # base64 data URL or None to clear


class AuthorOut(BaseModel):
    id: uuid.UUID
    name: str
    palette: str
    avatar: Optional[str] = None

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
    avatar: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    palette: str
    bio: str
    avatar: Optional[str] = None
    letters_count: int
    followers_count: int
    following_count: int
    is_following: bool = False
    notify_new_letters: bool = False


class LetterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=5)
    mood: Optional[str] = None


class LetterUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    body: Optional[str] = Field(None, min_length=1)
    tags: Optional[list[str]] = Field(None, max_length=5)
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
    share_code: Optional[str] = None


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
    likes_count: int = 0
    liked_by_me: bool = False
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
    notify_new_letters: bool = False
