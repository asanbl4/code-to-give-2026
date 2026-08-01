"""Who is calling, and are they allowed to.

Replaces the single shared `ADMIN_TOKEN` that used to guard the staff routes.
That token granted service-role access to whoever learned it, could not be
revoked for one person, and left no record of who had used it. A Supabase JWT
is per-person, expires on its own, and names a real row in `auth.users`.

Two steps, deliberately separate:

1. **Authentication** -- `get_current_user` verifies the token's signature
   against the project's published JWKS. Nothing here trusts a claim it has not
   checked cryptographically.
2. **Authorization** -- `require_staff` asks *Postgres* whether that user holds
   a staff role, through an RLS-scoped client carrying their own token. The
   answer comes from `public.user_roles`, not from anything the caller sent.

Step 2 matters: a JWT proves identity, never permission. A forged or stale
`role` claim in a token body would otherwise be a free promotion.
"""

from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError

from app.config import get_settings
from app.db import postgrest_errors, user_client

# auto_error=False so a missing header reaches our handler and gets a 401 with a
# WWW-Authenticate challenge, rather than FastAPI's bare 403.
_bearer = HTTPBearer(auto_error=False)

_UNCONFIGURED = (
    "Authentication is not configured. Set SUPABASE_URL in backend/.env "
    "-- see backend/.env.example."
)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


@dataclass(frozen=True)
class AuthenticatedUser:
    """A caller whose token verified. Says nothing about what they may do."""

    id: str
    email: str | None
    token: str


class JwtVerifier:
    """Verifies Supabase access tokens against the project's JWKS.

    Injectable so tests can supply a local keypair and never touch the network.
    """

    def __init__(self, supabase_url: str) -> None:
        self._issuer = f"{supabase_url.rstrip('/')}/auth/v1"
        # PyJWKClient caches keys, so a rotated signing key is picked up without
        # a redeploy but a burst of requests does not hammer the JWKS endpoint.
        self._jwks = PyJWKClient(f"{self._issuer}/.well-known/jwks.json", lifespan=300)

    def verify(self, token: str) -> dict[str, Any]:
        signing_key = self._jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            # Supabase signs with ES256 on current projects and HS256 on legacy
            # ones. Listing both is safe: the algorithm still has to match the
            # key we fetched, so this is not the "alg: none" footgun.
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
            issuer=self._issuer,
            options={"require": ["exp", "sub"]},
        )


@lru_cache(maxsize=1)
def _verifier() -> JwtVerifier:
    return JwtVerifier(get_settings().supabase_url)


def get_verifier() -> JwtVerifier:
    if not get_settings().supabase_url:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _UNCONFIGURED)
    return _verifier()


# A sync `def`, so FastAPI runs it in a threadpool: a cold JWKS cache makes a
# blocking HTTPS request, which would otherwise stall the event loop.
def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
    verifier: Annotated[JwtVerifier, Depends(get_verifier)] = None,  # type: ignore[assignment]
) -> AuthenticatedUser:
    if credentials is None or not credentials.credentials:
        raise _unauthorized("Not authenticated")

    token = credentials.credentials
    try:
        claims = verifier.verify(token)
    except jwt.ExpiredSignatureError as exc:
        raise _unauthorized("Token has expired") from exc
    except (jwt.InvalidTokenError, PyJWKClientError) as exc:
        # Covers a bad signature, wrong audience, wrong issuer, malformed token,
        # and -- via PyJWKClientError -- a `kid` this project never issued, which
        # is what a token forged with someone else's key looks like.
        #
        # PyJWKClientError is NOT a subclass of InvalidTokenError, so catching
        # only the latter let a forged token escape as a 500. Verified against
        # the live project: a self-signed ES256 token now gets 401, not 500.
        #
        # One message for all of them: saying which check failed would help
        # someone probing the endpoint.
        raise _unauthorized("Invalid token") from exc

    return AuthenticatedUser(
        id=str(claims["sub"]),
        email=claims.get("email"),
        token=token,
    )


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


def get_user_roles(user: CurrentUser) -> frozenset[str]:
    """The caller's roles, read from Postgres through the caller's own token.

    Not from a claim in the JWT. The token proves who you are; `public.user_roles`
    decides what you may do, and only the service role can write to it. Reading
    it through an RLS-scoped client means the `user_roles_select_own` policy is
    what limits the answer to this caller -- the same rule the database would
    apply to any other client.
    """
    client = user_client(user.token)
    with postgrest_errors():
        rows = client.table("user_roles").select("role").execute().data
    return frozenset(row["role"] for row in rows or [])


UserRoles = Annotated[frozenset[str], Depends(get_user_roles)]

# Roles allowed into the staff tool. 'admin' additionally manages the allowlist,
# which is a service-role operation and has no route yet.
STAFF_ROLES = frozenset({"admin", "editor"})


def require_staff(roles: UserRoles) -> None:
    """Gate for everything that writes with the service role.

    403, not 401: the caller proved who they are, so the problem is permission
    rather than identity, and re-authenticating would not help.
    """
    if not roles & STAFF_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This account is not a Love 21 staff account.",
        )


StaffOnly = Depends(require_staff)
