# E2E tests (Playwright)

End-to-end tests that drive Alley in a real (mobile) browser, against a local
Supabase stack. Separate from the Vitest unit suite in `src/**` — `npm test`
runs unit tests, `npm run test:e2e` runs these.

## Prerequisites

On a fresh checkout, fetch the browser once (the suite runs mobile-Chromium only):

```bash
npx playwright install chromium
```

These tests also need a local database. Start it first (requires Docker running):

```bash
supabase start      # boots Postgres + Auth + Realtime, applies supabase/migrations/
```

Leave it running. Stop it later with `supabase stop`.

## Running

```bash
npm run test:e2e          # headless run (starts the dev server automatically)
npm run test:e2e:ui       # interactive UI mode — watch tests step through a live browser
npx playwright show-report   # open the HTML report from the last run
npx playwright codegen localhost:5173   # click through the app; it writes a test for you
```

Playwright boots the app itself via `npm run dev:test` (`vite --mode test`), so
you don't need a dev server running — but `supabase start` must be up.

## CI

`.github/workflows/e2e.yml` runs this suite on every push to `main` and on pull
requests. The job mirrors the local flow: install deps, `npx playwright install
--with-deps chromium`, install the Supabase CLI, `supabase start` (Docker is
preinstalled on the `ubuntu-latest` runner), then `npm run test:e2e`. The
Playwright HTML report is uploaded as a build artifact.

No GitHub secrets are required — the keys in `.env.test` and `local-supabase.js`
are the committed local-dev ones. Playwright's CI behaviour (`forbidOnly`, two
retries, a fresh `vite --mode test` server) switches on automatically because
GitHub sets `CI=true`.

This is independent of Cloudflare's auto-deploy, which builds and ships on push
regardless. To require green tests before code lands, protect `main` and mark the
`e2e` check as required, then merge via PR.

## How it's wired

The app normally points at the cloud Supabase project. In test mode,
`.env.test` (loaded by `vite --mode test`, which overrides `.env.local`) points
it at **local Supabase** and swaps in a Cloudflare Turnstile **test sitekey**
(`1x00000000000000000000AA`) that always passes — so there's no real captcha to
solve. Local Supabase also has captcha disabled server-side, so sign-in just
works.

Five Playwright projects (see `playwright.config.js`):

| Project | Runs | Auth |
| --- | --- | --- |
| `setup` | `auth.setup.js` | seeds the test artist + inventory, logs in via the real UI, saves the session to `e2e/.auth/artist.json` |
| `setup-admin` | `admin.setup.js` | creates an admin account (email + password, `is_admin` flipped via service role), logs in via the admin UI, saves the session to `e2e/.auth/admin.json` |
| `logged-out` | `logged-out/**` | none — for the login UIs |
| `logged-in` | `logged-in/**` | reuses the artist session (`storageState`), so tests land straight on the artist dashboard |
| `admin` | `admin/**` | reuses the admin session (`storageState`), so tests land straight on the admin dashboard |

`logged-in` depends on `setup`. `admin` depends on `setup` **and** `setup-admin`
— it reuses the admin session, and it needs the seeded artist's inventory to
have something to display, aggregate, and export.

Admins auth differently from artists: plain email + password, not the artist
name + PIN. `is_admin` is never client-writable (RLS blocks self-promotion), so
`admin.setup.js` flips it with the service-role key.

## Files

```
auth.setup.js                      seeds the artist + inventory + storage bucket, captures the signed-in storageState
admin.setup.js                     creates + promotes the admin, captures the signed-in storageState
local-supabase.js                  local URL + keys + test-artist / test-admin constants
login.js                           loginWithPin() — drives the artist name -> PIN-pad UI (shared)
fixtures/png.js                    makePng() — builds a valid in-memory PNG for the photo tests
logged-out/login.spec.js           artist login page renders; identifier -> PIN transition
logged-out/login-negative.spec.js  a wrong PIN shows an error and clears the pad
logged-out/admin-login.spec.js     admin login page renders; anon /admin -> /admin/login
logged-out/routing.spec.js         unknown path -> NotFound; anon /artist -> /login
logged-out/sign-out.spec.js        sign in a throwaway artist, Sign out -> back to /login
logged-in/artist-dashboard.spec.js dashboard shows the seeded inventory
logged-in/add-item.spec.js         add item via the form (asserted in DB); + photo upload to Storage
logged-in/sell-decrements-stock.spec.js  Sell 1 -> sale row + stock decrement (asserted in DB)
logged-in/admin-route-guard.spec.js      artist on /admin -> bounced to /artist
admin/admin-dashboard.spec.js      stats + seeded artist/items render; admin on /artist -> /admin
admin/excel-export.spec.js         Export Excel -> downloads a workbook; figures asserted from the file
.auth/artist.json                  generated artist session state (gitignored)
.auth/admin.json                   generated admin session state (gitignored)
```

> The sign-out test lives in `logged-out`, not `logged-in`, on purpose:
> `supabase.auth.signOut()` is global, so signing out the shared test artist
> would revoke the session every other logged-in test reuses. It signs in its
> own throwaway artist instead.

## Storage bucket

The photo-upload path writes to a public Storage bucket named `item-images`.
It's declared in `supabase/config.toml` (`[storage.buckets.item-images]`), so a
fresh `supabase start` / `supabase db reset` provisions it. `auth.setup.js` also
creates it idempotently via the service-role key, so the suite works against a
stack that was already running before that config was added.

## Writing tests that change data

Tests that mutate the database create their own item via the service-role key,
assert the result against the DB directly (proving the trigger/RLS, not just the
optimistic UI), and clean up in a `finally` block — so they stay isolated and
rerunnable. See `logged-in/sell-decrements-stock.spec.js`.

## Test data

`auth.setup.js` creates the artist `table1@alley.local` (PIN `482134`) and two
sample items via the service-role key. `admin.setup.js` creates the admin
`admin@alley.local` and flips its `is_admin` flag. Both are idempotent: reruns
reuse the existing user (resetting the credential) and keep existing rows. The
Excel test additionally creates and tears down its own throwaway artist each run.
For a completely clean slate (drops everything, re-applies migrations):

```bash
supabase db reset
```

## Local keys

`local-supabase.js` and `.env.test` hold the Supabase CLI's fixed local-dev
keys — non-secret and identical on every machine, so they're committed. If
`supabase status` ever prints different `anon` / `service_role` keys, update
both files to match.

> Never put the **cloud** project's keys here. These are local-only.
