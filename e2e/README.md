# E2E tests (Playwright)

End-to-end tests that drive Alley in a real (mobile) browser, against a local
Supabase stack. Separate from the Vitest unit suite in `src/**` — `npm test`
runs unit tests, `npm run test:e2e` runs these.

## Prerequisites

These tests need a local database. Start it first (requires Docker running):

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

## How it's wired

The app normally points at the cloud Supabase project. In test mode,
`.env.test` (loaded by `vite --mode test`, which overrides `.env.local`) points
it at **local Supabase** and swaps in a Cloudflare Turnstile **test sitekey**
(`1x00000000000000000000AA`) that always passes — so there's no real captcha to
solve. Local Supabase also has captcha disabled server-side, so sign-in just
works.

Three Playwright projects (see `playwright.config.js`):

| Project | Runs | Auth |
| --- | --- | --- |
| `setup` | `auth.setup.js` | seeds the test artist + inventory, logs in via the real UI, saves the session to `e2e/.auth/artist.json` |
| `logged-out` | `logged-out/**` | none — for the login UI |
| `logged-in` | `logged-in/**` | reuses the saved session (`storageState`), so tests land straight on authenticated pages |

`logged-in` depends on `setup`, so the session is always fresh.

## Files

```
auth.setup.js                      seeds data + captures the signed-in storageState
local-supabase.js                  local URL + keys + test-artist constants
logged-out/login.spec.js           login page renders; identifier -> PIN transition
logged-in/artist-dashboard.spec.js dashboard shows the seeded inventory
logged-in/sell-decrements-stock.spec.js  Sell 1 -> sale row + stock decrement (asserted in DB)
.auth/artist.json                  generated session state (gitignored)
```

## Writing tests that change data

Tests that mutate the database create their own item via the service-role key,
assert the result against the DB directly (proving the trigger/RLS, not just the
optimistic UI), and clean up in a `finally` block — so they stay isolated and
rerunnable. See `logged-in/sell-decrements-stock.spec.js`.

## Test data

`auth.setup.js` creates the artist `table1@alley.local` (PIN `482134`) and two
sample items via the service-role key. It's idempotent: reruns keep existing
rows. For a completely clean slate (drops everything, re-applies migrations):

```bash
supabase db reset
```

## Local keys

`local-supabase.js` and `.env.test` hold the Supabase CLI's fixed local-dev
keys — non-secret and identical on every machine, so they're committed. If
`supabase status` ever prints different `anon` / `service_role` keys, update
both files to match.

> Never put the **cloud** project's keys here. These are local-only.
