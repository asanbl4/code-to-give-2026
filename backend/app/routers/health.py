from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe (no auth required)")
def health() -> dict[str, str]:
    return {"status": "ok"}
