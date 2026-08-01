# Instagram integration — setup & operations

How to get an Instagram Graph API token and plug it into the backend so the
`/instagram` page shows real posts. Official API only — no scraping.

Feature code: `backend/app/features/instagram/` and
`frontend/features/instagram/`. Endpoint: `GET /api/instagram/posts`.

> **You don't need a token to develop.** With no token set, the backend serves
> bundled sample posts and the UI shows a "sample posts" banner. Everything
> below is only needed to switch to *real* data.

---

## Prerequisites

- The Instagram account must be **Business or Creator** (not personal).
  Convert in the app: Settings → *Account type and tools* → *Switch to
  professional account*. Free, instant, reversible. **(You've done this.)**
- A Facebook account to log into the Meta developer dashboard. (No Facebook
  *Page* is required for the "Instagram login" path we use.)

---

## Step 1 — Create a Meta app

1. Go to <https://developers.facebook.com/apps/> and log in.
2. Click **Create app**.
3. If asked *"What do you want to build?"* (use case), choose **Other** → **Next**.
4. App type: choose **Business** → **Next**.
5. Enter an **app name** (e.g. `love21-instagram`) and your **contact email** →
   **Create app**. (Confirm your password if prompted.)

The app starts in **Development mode** — that's fine. Reading your *own*
account needs **no App Review**.

## Step 2 — Add the Instagram product

1. In the app dashboard, find **Instagram** in the product list → click **Set up**.
2. In the left sidebar, open **Instagram** → **API setup with Instagram login**.

## Step 3 — Generate the access token (the easy path)

On the **API setup with Instagram login** page:

1. Under **"1. Generate access tokens"**, click **Add account**.
2. A Meta/Instagram window opens → **log into your Business Instagram account**
   and **approve** the permissions (it requests `instagram_business_basic`,
   which is read access to your own profile and media).
3. You're returned to the dashboard with your Instagram username listed. Click
   **Generate token** next to it.
4. **Copy the token immediately and save it somewhere safe** — the dashboard
   will not show it again.

> **Hit "Insufficient Developer Role"?** The app is in Development mode, so the
> Instagram account must have a role on the app first. Add it as a tester and
> accept the invite — see Troubleshooting below.

Tokens generated here are **long-lived (valid ~60 days)**, so for the hackathon
you're done — skip to Step 5. If yours turns out to be short-lived (see the
troubleshooting note), do Step 4 once.

> Also on this page: your **Instagram app ID** and **Instagram app secret**.
> You only need those for the manual curl steps in Step 4. Treat the secret like
> a password.
>
> If the page asks for an **OAuth redirect URI** before it lets you generate a
> token, put `https://localhost/` — the dashboard generator doesn't actually use
> it, but the field may be required.

## Step 4 — (Only if your token is short-lived) exchange for long-lived

Short-lived tokens last ~1 hour. Exchange once for a ~60-day token:

```bash
curl -s "https://graph.instagram.com/access_token\
?grant_type=ig_exchange_token\
&client_secret=INSTAGRAM_APP_SECRET\
&access_token=SHORT_LIVED_TOKEN"
# → {"access_token":"LONG_LIVED_TOKEN","token_type":"bearer","expires_in":5184000}
```

Refresh anytime after 24h (not needed within the hackathon):

```bash
curl -s "https://graph.instagram.com/refresh_access_token\
?grant_type=ig_refresh_token&access_token=LONG_LIVED_TOKEN"
```

## Step 5 — Plug the token into the backend

1. If `backend/.env` doesn't exist yet, create it from the example:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit `backend/.env` and set the token (no quotes needed):
   ```
   INSTAGRAM_ACCESS_TOKEN=PASTE_YOUR_LONG_LIVED_TOKEN
   ```
   `.env` is gitignored — the token never gets committed. It lives on the
   backend only and is never exposed to the browser.
3. Restart uvicorn so it re-reads `.env`.

## Step 6 — Verify

**Token works at all (optional direct check):**

```bash
curl -s "https://graph.instagram.com/me/media\
?fields=id,caption,media_type,media_url,permalink,timestamp\
&access_token=YOUR_TOKEN"
```

**Through our backend** — `source` should now be `"live"`:

```bash
curl -s "http://127.0.0.1:8000/api/instagram/posts?limit=3"
```

**In the app:** open <http://localhost:3000/instagram>. The amber "sample posts"
banner is gone and your real posts appear.

---

## How the feature works (short version)

```
Instagram Graph API ──▶ backend (fetch + normalize + 5-min cache) ──▶ GET /api/instagram/posts ──▶ /instagram page
                                     │
                          no token / fetch fails ──▶ bundled sample posts (source: "fixture")
```

- We never call Instagram from the browser — only the backend holds the token.
- A live fetch is cached for `INSTAGRAM_CACHE_TTL_SECONDS` (default 300) so page
  loads don't each hit Instagram (limit is ~200 req/hr/account).
- `media[].url` is a **signed CDN URL that expires in hours**. Fine while we
  fetch live and pass it straight through. Persisting posts later means
  downloading + re-hosting the media at ingest — out of scope for this MVP.

### Config (`backend/.env`)

| Var | Default | Purpose |
|-----|---------|---------|
| `INSTAGRAM_ACCESS_TOKEN` | _(empty)_ | Long-lived token. Empty ⇒ sample data. |
| `INSTAGRAM_USER_ID` | `me` | Account to read (`me` = the token's account). |
| `INSTAGRAM_CACHE_TTL_SECONDS` | `300` | Live-fetch cache lifetime. |

---

## Troubleshooting

- **"Insufficient Developer Role" when connecting the account** — the app is in
  Development mode, so the Instagram account needs a role on the app. **(1)** In
  the dashboard: **App roles → Roles → Add People → Instagram Tester**, enter the
  account's Instagram username (shows as *Pending*). **(2)** On that Instagram
  account: **Settings → Apps and websites → Tester invites → Accept**. **(3)**
  Retry **Generate token**. Also make sure the login popup is signed into the
  *same* account you added as a tester (use an incognito window if another IG
  account is signed in).
- **`source` still `"fixture"` after setting the token** — restart uvicorn (it
  reads `.env` at startup); confirm the var is `INSTAGRAM_ACCESS_TOKEN` and has
  no surrounding quotes; check the uvicorn log for a "live fetch failed" warning.
- **`400 / OAuthException`** — token expired or wrong. Regenerate (Step 3) or
  re-exchange (Step 4).
- **Empty `posts` but `source: "live"`** — the account genuinely has no media, or
  the media is of a type we don't map. Post something and retry.
- **How do I know if my token is short- or long-lived?** Paste it into the
  [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
  — it shows the expiry.

---

## Sources

- Meta — Instagram API with Instagram login, get started / business login:
  <https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login>
- Token generation walkthrough (2026): <https://wpsocialninja.com/instagram-access-token/>,
  <https://theplusaddons.com/blog/get-instagram-access-token/>
