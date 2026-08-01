"""Give a staff account a password, so signing in needs no email.

Supabase's built-in email sender allows about two messages an hour, which is
fine day to day and a liability five minutes before a demo. A password sign-in
sends nothing, so it cannot be rate limited.

    uv run python scripts/set_staff_password.py someone@love21foundation.com

The password is read from a prompt, never from argv -- an argument would sit in
your shell history and in `ps` output for every other user on the machine.

Creates the auth user if they do not exist yet, then confirms the role the
database actually granted. Requires SUPABASE_URL and SUPABASE_SECRET_KEY in
backend/.env; the secret key bypasses RLS, so this is a local admin tool and
never something the API exposes.
"""

from __future__ import annotations

import argparse
import getpass
import sys
from typing import Any

import httpx

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402

# Supabase's own default is 6, which is too short to be worth having. This is a
# local check: raise the project's real minimum in Auth -> Providers -> Email.
MIN_PASSWORD_LENGTH = 12


def _admin_headers(secret: str) -> dict[str, str]:
    return {
        "apikey": secret,
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def _find_user(client: httpx.Client, base: str, headers: dict[str, str], email: str) -> Any:
    # The admin list endpoint has no server-side email filter, so page through.
    page = 1
    while True:
        response = client.get(
            f"{base}/auth/v1/admin/users",
            headers=headers,
            params={"page": page, "per_page": 200},
        )
        response.raise_for_status()
        users = response.json().get("users", [])
        if not users:
            return None
        for user in users:
            if (user.get("email") or "").lower() == email:
                return user
        page += 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email", help="The staff member's email address")
    args = parser.parse_args()

    email = args.email.strip().lower()
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_secret_key:
        print(
            "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env "
            "-- see backend/.env.example.",
            file=sys.stderr,
        )
        return 1

    password = getpass.getpass(f"New password for {email}: ")
    if len(password) < MIN_PASSWORD_LENGTH:
        print(f"Too short: use at least {MIN_PASSWORD_LENGTH} characters.", file=sys.stderr)
        return 1
    if password != getpass.getpass("Confirm: "):
        print("Passwords did not match.", file=sys.stderr)
        return 1

    base = settings.supabase_url.rstrip("/")
    headers = _admin_headers(settings.supabase_secret_key)

    with httpx.Client(timeout=30) as client:
        user = _find_user(client, base, headers, email)

        if user is None:
            response = client.post(
                f"{base}/auth/v1/admin/users",
                headers=headers,
                json={"email": email, "password": password, "email_confirm": True},
            )
            if response.is_error:
                print(f"Could not create the user: {response.text}", file=sys.stderr)
                return 1
            user = response.json()
            print(f"Created {email}.")
        else:
            # PUT, not PATCH: the Auth admin API answers 405 to PATCH here.
            response = client.put(
                f"{base}/auth/v1/admin/users/{user['id']}",
                headers=headers,
                json={"password": password},
            )
            if response.is_error:
                print(f"Could not set the password: {response.text}", file=sys.stderr)
                return 1
            print(f"Password updated for {email}.")

        # Report the role rather than granting one. Roles come from
        # public.role_allowlist via a trigger, and quietly writing user_roles
        # here would put a second, competing source of truth in the codebase.
        roles = client.get(
            f"{base}/rest/v1/user_roles",
            headers=headers,
            params={"user_id": f"eq.{user['id']}", "select": "role"},
        )
        granted = [row["role"] for row in roles.json()] if roles.is_success else []

    if granted:
        print(f"Roles: {', '.join(sorted(granted))}")
        if not {"admin", "editor"} & set(granted):
            print("Note: this is not a staff role, so the admin panel will refuse them.")
    else:
        print(
            "No roles granted yet. Add them to the allowlist, then re-run:\n"
            "  insert into public.role_allowlist (email, role)\n"
            f"  values ('{email}', 'editor');",
        )

    print("\nSign in at /admin/login with this email and password. No email is sent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
