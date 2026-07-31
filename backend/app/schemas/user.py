from datetime import datetime

from pydantic import BaseModel, ConfigDict


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class Me(BaseModel):
    """Identity from the verified token, plus the profile row it maps to."""

    id: str
    email: str | None
    role: str
    profile: Profile | None
