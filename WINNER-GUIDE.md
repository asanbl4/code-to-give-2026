# WINNER-GUIDE.md

> A playbook for a coding agent building a nonprofit hackathon project, distilled from
> **Athena Paths** — winner of Code to Give 2025 Montreal (Morgan Stanley), built for
> Shield of Athena Family Services.
>
> Read this before writing code. It is not a description of what we built. It is a
> description of *why it won*, generalized so you can beat it.

---

## 0. The one-sentence thesis

**You are not judged on code. You are judged on whether the nonprofit's staff can
picture themselves using it on Monday.**

Every technical decision below exists to serve that. A beautiful architecture that
can't be demoed, deployed, or handed off loses to a modest one that can.

---

## 1. Understand who the *end user* actually is

The most common losing move: building for the donor because the brief says "donation
platform," and forgetting the nonprofit exists to serve someone else entirely.

Athena Paths served **three** audiences, and the judges noticed all three:

| Audience | What they need | What we shipped |
|---|---|---|
| Donors | To feel their money did something specific | Path routing, impact points, badges |
| Nonprofit staff | Something they can run without a developer | One container, file-based data, zero cloud bills |
| **Survivors in danger** | Safety, in their own language | Quick Exit, 39 languages, moderated Hope Wall |

**The third row is what wins.** Find the vulnerable person adjacent to your brief and
build one feature that protects them. Ours:

```js
// Opens a decoy tab AND replaces the current history entry,
// so the browser Back button cannot return an abuser to this page.
const quickExit = () => {
  window.open('https://www.google.com', '_blank', 'noopener,noreferrer');
  window.location.replace('https://www.google.com');
};
useEffect(() => {
  const onEsc = (e) => { if (e.key === 'Escape') quickExit(); };
  window.addEventListener('keydown', onEsc);
  return () => window.removeEventListener('keydown', onEsc);
}, []);
```

Twelve lines. It was the first thing demoed and it reframed everything after it.

**Action:** before your first commit, read the nonprofit's actual public site. Find
their mission statement's adjectives. Ours said *"culturally and linguistically
adapted."* That single phrase justified the entire multilingual subsystem — and made
it a mission requirement rather than a feature we invented.

---

## 2. Design one economy, derive everything from it

The strongest architectural idea in Athena Paths: **one append-only ledger, everything
else computed.**

```
donations.csv  →  uuid, amount, path, impact_points, hours, created_at
```

Everything downstream is a *view* of that table:
- Profile stats (`/me` recomputes on every request)
- Personal + team leaderboards (pandas `groupby`)
- Badge eligibility
- Community goal progress

Nothing is a stored counter, so nothing can drift out of sync. No cache invalidation,
no migration when rules change, no "why does the leaderboard disagree with my profile."

Three moves made the ledger carry unusual weight:

**a) Non-money contributions enter the same ledger.**
Volunteer hours are written as rows with `amount=0, path="SERVICE",
impact_points = hours * 10`. A volunteer and a donor become comparable in one currency.
This alone made the nonprofit lean forward — volunteers are their scarcest resource and
nobody ever gamifies them.

**b) Rewards enter the same ledger.**
A referral bonus is not a special `bonus_points` column. It's a row:
`amount=0, path="Referral Bonus", impact_points=10`. Same for every future reward type.
One code path, forever.

**c) The exchange rate encodes the mission.**

```js
let points = amount;
if (item.path === "PROTECTION") points = Math.floor(amount * 1.5);
else if (item.path === "COURAGE") points = Math.floor(amount * 1.2);
```

Emergency shelter is the hardest thing to fundraise for and the most urgent thing they
provide. We paid 50% more points for it. **Name this out loud in the demo** — "we
weighted the multiplier toward your hardest-to-fund program" is a sentence that proves
you talked to them.

**Action:** find your partner's least-fundable, most-critical service. Make your
incentive system visibly favour it. Then say so.

---

## 3. Rules as data, not as control flow

The brief you're likely working from will tempt you into a `handleDonation()` function
that's 200 lines of `if`. Don't.

Athena Paths declared 12 achievements as objects with predicate functions:

```js
export const BADGE_DEFINITIONS = {
  ALL_PATHS: {
    id: 'all_paths',
    name: { en: 'Complete Supporter', fr: 'Soutien Complet' },
    icon: allPaths,
    condition: (user, donations, referrals, teams) => {
      const paths = new Set(donations.map(d => d.path));
      return paths.has('WISDOM') && paths.has('COURAGE') && paths.has('PROTECTION');
    }
  },
  // ...
};
```

The evaluator is generic: fetch state in parallel, diff *condition-met* against
*already-earned*, POST only the delta.

```js
const [donationsRes, referralsRes, userBadgesRes] = await Promise.all([...]);
const existing = new Set(userBadgesRes.badges.map(b => b.badge_id));
await Promise.all(Object.values(BADGE_DEFINITIONS).map(async (def) => {
  if (def.condition(user, donations, referrals, teams) && !existing.has(def.id)) {
    await fetch(`${API}/users/${user.id}/badges`, { method: 'POST', /* ... */ });
    newlyEarned.push(def);
  }
}));
```

Why this wins points: **a judge or a nonprofit staffer can read the rules.** Adding
a 13th badge during Q&A ("could you add one for monthly donors?") is a five-line answer
you can give live. That moment is worth more than any optimization.

Corollary: we shipped `check_badges.py`, a pandas reimplementation of the same 12 rules
for offline backfill. Having two independent implementations that agree is a
credibility signal — and it let us seed a realistic demo database.

---

## 4. Deployment is a feature. Budget a full day for it.

Most hackathon projects die at `npm start` on a laptop. The single highest-leverage
non-feature work you can do:

**Ship one Docker image containing the entire stack.**

```dockerfile
# Stage 1 — build the SPA
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2 — nginx + API in one supervised image
FROM python:3.11-slim
RUN apt-get update && apt-get install -y nginx supervisor curl \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/build /var/www/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

nginx fronts everything, proxying only API prefixes to the local API process:

```nginx
location ~ ^/(login|signup|logout|donate|volunteer|me|users/|teams/|leaderboard|docs) {
    proxy_pass http://127.0.0.1:8000;
}
location / { try_files $uri $uri/ /index.html; }   # SPA routing
location ~* \.(js|css|png|svg|woff2)$ {
    expires 1y; add_header Cache-Control "public, immutable";
}
```

**The trick that removes an entire class of bugs** — make the API base URL empty in
production so the browser calls same-origin:

```js
export const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');
```

No CORS in production. No env var to misconfigure on stage. No mixed-content errors.

Then a `prod` branch that auto-deploys, using OIDC federation rather than stored
credentials:

```yaml
on: { push: { branches: [prod] } }
permissions: { id-token: write, contents: read }
steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
```

**Say this line in the demo:** *"It's one container. `docker compose up`. When you
outgrow the files, swap the six loader functions for a database and nothing else
changes."* Nonprofits have no DevOps team and no budget — a handoff story is a feature
they can actually evaluate.

---

## 5. The demo must be unkillable

Conference wifi will fail. The judges' laptop will be on a captive portal. Your
deployment will 502 at exactly the wrong moment.

Athena Paths had a **complete in-memory mirror of the API** (~700 lines) with seeded
users, donations, goals and messages, plus a cookie-flagged offline demo account.
Auth degrades through three tiers:

```
backend session cookie  →  cookie-flagged offline demo user  →  local dataService user
```

The badge engine has a matching offline branch that computes purely from local state.
The Hope Wall merges seeded defaults with persisted rows, so an empty database still
renders a full, warm page.

**Every list must look good with zero rows.** Empty states are where hackathon demos
visibly fall apart, and it's the cheapest thing to fix.

Related: **seed realistic data.** We wrote `generate_users.py`, `generate_teams.py`,
`generate_donations.py` — 50 named users, teams, hundreds of dated donations. A
leaderboard with 3 rows named "test test" reads as a prototype. One with 50 plausible
people and a contested top-5 reads as a product.

---

## 6. Defensive data handling buys you the whole weekend

If you use flat files (a legitimate choice — see §4), pay these small costs up front:

```python
def load_donations():
    try:
        df = pd.read_csv("donations.csv")
    except FileNotFoundError:
        df = pd.DataFrame(columns=["uuid","amount","path","impact_points","hours","created_at"])
    # hand-rolled forward migration: older files keep working
    for col in ["hours", "created_at"]:
        if col not in df.columns:
            df[col] = None
    return df
```

Every loader: catches missing-file, returns a *typed* empty frame, backfills columns
added later. This meant we changed the schema three times mid-hackathon without a
single teammate's local data breaking. On a 36-hour clock, not losing four hours to
"works on my machine" *is* the win.

Also normalize on the way out — `df.where(pd.notnull(df), " ")` before
`to_dict(orient="records")`, because `NaN` is not valid JSON and will blow up your
frontend at the worst possible time.

---

## 7. Design that doesn't look like Bootstrap

Judges see fifteen projects. Twelve use default shadcn/Tailwind blue. Differentiate
cheaply:

- **Derive a palette from the org's real brand**, then commit it to
  `tailwind.config.js` as semantic tokens (`primary`, `accent`, `highlight`, `muted`)
  — never raw hex in components. Ours came from Shield of Athena's lilac.
- **One motion library, used consistently.** `framer-motion` with
  `AnimatePresence mode="wait"` on step transitions, spring entrances on result cards.
  Motion should confirm state changes, not decorate.
- **Build ~10 small primitives** (`Button`, `Card`, `Dialog`, `Progress`, `Tabs`,
  `Avatar`) and never style ad hoc. Consistency reads as polish more than any single
  flourish.
- **Test mobile.** Judges pull it up on a phone. We spent real commits on the mobile
  sidebar and banner and it mattered.

---

## 8. Do the thing everyone skips: an interactive front door

Nobody donates to a wall of text. A 3-question quiz that ends in *"Your Path is
Protection"* takes ~200 lines and transforms the whole experience:

- Options carry `weights: { PROTECTION: 1 }` — a scoring vector, not a switch. Adding
  a fifth path never touches the scoring code.
- Result routes to a filtered donation page (`/path-results?path=PROTECTION`), so the
  quiz *ends in an action*, not a badge of self-knowledge.
- Every question, option, and description is authored in both languages inline.

This is also your demo's narrative spine. You need a 90-second story with a
beginning: *land → quiz → path → donate → badge → leaderboard → share*. Build the
features that make that one path shine and let the rest be adequate.

---

## 9. Anti-patterns that lose

| Anti-pattern | Why it loses |
|---|---|
| Bolting on an LLM chatbot | Judges have seen ten. It's not the nonprofit's problem. If you use AI, solve a *named* operational pain — not "ask me anything." |
| Microservices / Kubernetes | Complexity the nonprofit can never maintain. Read as showing off. |
| Auth as the first two days | Nobody scores your OAuth flow. A session cookie is enough for a hackathon; say so honestly. |
| Admin dashboards nobody asked for | Build what the *mission* needs, not what CRUD scaffolding gives you free. |
| Features with no demo path | If it can't appear in the 90-second story, it's invisible. Cut it. |
| Leaving generated data as `test1@test.com` | Instantly reads as unfinished. |
| Ignoring French (in Quebec) | Non-negotiable. Applies to any locale-specific competition — find the local equivalent. |

---

## 10. Be honest about limits — it reads as maturity

Athena Paths had real weaknesses: CSV files with no write-locking (concurrent writes
can lose data), a session cookie that is the raw user id, a bcrypt salt generated once
at import time, no rate limiting. It still won.

**Because we named them, with a migration path.** "Files today because you have no
budget and no DBA. Six functions isolate all persistence — swapping in Postgres is an
afternoon." That's an engineer talking to a future maintainer. Pretending there are no
limits is what gets picked apart in Q&A.

Have a one-slide "what we'd do next" ready: real database + row locking, signed
session tokens with expiry, Stripe for actual payments, an admin moderation queue for
the message wall, rate limiting on public POSTs.

---

## 11. Pre-submission checklist

- [ ] `git clone && docker compose up` works on a clean machine — **verified by someone who didn't write it**
- [ ] README has setup for both services, plus screenshots (judges skim; images do the talking)
- [ ] Works offline / with the API down
- [ ] Every list renders correctly with zero rows
- [ ] Fully usable on a phone
- [ ] Both official languages complete on every user-facing string
- [ ] Seed data uses realistic names and dates
- [ ] No console errors on the demo path
- [ ] One safety/accessibility feature that shows you understood the *vulnerable* user
- [ ] The 90-second demo path rehearsed end to end, out loud, at least twice
- [ ] A written "how to hand this off" section for the nonprofit
- [ ] Known limitations written down with fixes, not hidden

---

## 12. Budget your hours

Roughly what Athena Paths spent, and what to copy:

| Share | Work |
|---|---|
| 10% | Research the org. Read their site. Extract mission language. Decide the third audience. |
| 15% | Data model + the one economy. Get the ledger right before any UI. |
| 35% | The demo path: front door → action → reward → social loop. |
| 15% | Deployment, container, CI. Start this **before** you feel ready. |
| 10% | Seed data, empty states, offline fallback. |
| 10% | Polish: mobile, motion, palette, copy in both languages. |
| 5% | Rehearse the demo. Write the limitations slide. |

Note what's missing: tests. In a 36-hour build, correctness comes from tiny surface
area and defensive loaders, not from a suite you'll never run. Be deliberate about
that trade, and say so if asked.

---

## The summary you should tape above your desk

1. Find the vulnerable person adjacent to the brief. Build one thing that protects them.
2. Design one ledger. Derive everything else. Encode the mission in the exchange rate.
3. Rules as data, not `if` chains — so you can change them live in Q&A.
4. Ship one container with a same-origin API and push-to-deploy. Day one, not day two.
5. Make the demo survive no wifi, no database, and no rows.
6. Tell a 90-second story, and cut anything not in it.
7. Name your limits and your migration path.

Win by being the team the nonprofit could actually hire.
