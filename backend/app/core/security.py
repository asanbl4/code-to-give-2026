"""Verification of Supabase-issued access tokens.

Supabase signs access tokens with asymmetric keys (ES256 by default) and
publishes the public half at `/auth/v1/.well-known/jwks.json`. We fetch that
once, cache it, and verify signatures locally -- so authenticating a request
costs no network round-trip.

Legacy projects that still use a shared HS256 secret are supported by setting
SUPABASE_JWT_SECRET.
"""

from dataclasses import dataclass, field
from typing import Any

import jwt
from jwt import PyJWKClient

# How long a fetched JWKS stays cached before PyJWKClient refetches it.
_JWKS_CACHE_SECONDS = 300


class TokenError(Exception):
    """Raised when a token is missing, malformed, expired, or untrusted."""


@dataclass(frozen=True)
class AuthUser:
    """The authenticated caller, as asserted by Supabase's signed token."""

    id: str
    email: str | None
    role: str
    claims: dict[str, Any] = field(default_factory=dict)


class TokenVerifier:
    """Verifies access tokens against a Supabase project's signing keys."""

    def __init__(
        self,
        *,
        jwks_url: str,
        issuer: str,
        audience: str,
        hs256_secret: str = "",
        jwk_client: Any | None = None,
    ) -> None:
        self._issuer = issuer
        self._audience = audience
        self._hs256_secret = hs256_secret
        # Injectable so tests can verify against a locally generated keypair
        # without reaching the network.
        self._jwk_client = jwk_client or PyJWKClient(
            jwks_url,
            cache_keys=True,
            lifespan=_JWKS_CACHE_SECONDS,
        )

    def verify(self, token: str) -> AuthUser:
        """Return the caller described by `token`, or raise TokenError."""
        try:
            algorithm = jwt.get_unverified_header(token).get("alg", "")
        except jwt.PyJWTError as exc:
            raise TokenError("Malformed token header") from exc

        if algorithm.startswith("HS"):
            key: Any = self._hs256_secret
            if not key:
                raise TokenError("Token is HS256-signed but SUPABASE_JWT_SECRET is not configured")
            algorithms = ["HS256"]
        else:
            try:
                key = self._jwk_client.get_signing_key_from_jwt(token).key
            except Exception as exc:  # network failure, unknown kid, bad JWKS
                raise TokenError("Could not resolve the token's signing key") from exc
            algorithms = ["ES256", "RS256"]

        try:
            claims = jwt.decode(
                token,
                key=key,
                algorithms=algorithms,
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["exp", "sub"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise TokenError("Token has expired") from exc
        except jwt.InvalidAudienceError as exc:
            raise TokenError("Token audience is not accepted") from exc
        except jwt.InvalidIssuerError as exc:
            raise TokenError("Token was not issued by this Supabase project") from exc
        except jwt.PyJWTError as exc:
            raise TokenError("Token is invalid") from exc

        return AuthUser(
            id=claims["sub"],
            email=claims.get("email"),
            role=claims.get("role", "authenticated"),
            claims=claims,
        )
