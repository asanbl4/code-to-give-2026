"""The guard on the staff admin routes.

A single shared token, not per-user auth. That is a deliberate hackathon
trade-off and it is written down in the README rather than hidden: these routes
write with the service-role key, which bypasses RLS entirely, so leaving them
open is not an option either.

Migration path when it matters: the magic-link design in
`docs/superpowers/specs/` was built against this project once and can return.
"""

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.config import get_settings


def require_admin(x_admin_token: Annotated[str | None, Header()] = None) -> None:
    settings = get_settings()

    # Refuse rather than default open. An unset token must never mean "allow".
    if not settings.admin_configured:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Admin routes are not configured. Set ADMIN_TOKEN and SUPABASE_SECRET_KEY "
            "in backend/.env -- see backend/.env.example.",
        )

    # compare_digest, not ==, so a wrong token cannot be recovered by timing how
    # long the comparison took.
    if not x_admin_token or not secrets.compare_digest(x_admin_token, settings.admin_token):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid or missing admin token",
            headers={"WWW-Authenticate": "X-Admin-Token"},
        )


AdminOnly = Depends(require_admin)
