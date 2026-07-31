from fastapi import APIRouter

from app.core.errors import postgrest_errors
from app.deps import CurrentUser, Db
from app.schemas.user import Me, Profile

router = APIRouter(prefix="/api", tags=["me"])


@router.get("/me", response_model=Me, summary="The caller's identity and profile")
def read_me(user: CurrentUser, db: Db) -> Me:
    with postgrest_errors():
        # RLS restricts this to the caller's own row, so no filter is needed --
        # but we keep one anyway so the query is obvious to a reader.
        result = db.table("profiles").select("*").eq("id", user.id).limit(1).execute()

    row = result.data[0] if result.data else None
    return Me(
        id=user.id,
        email=user.email,
        role=user.role,
        profile=Profile.model_validate(row) if row else None,
    )


@router.get("/me/claims", summary="Raw verified JWT claims (handy while debugging)")
def read_claims(user: CurrentUser) -> dict:
    return user.claims
