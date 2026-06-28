# alley

A mobile-first inventory and sales tracker for artists and organizers at anime/comic/fandom conventions.

Artists log in on their phones and mark items sold from their table. Admins see a dashboard
across all artists and can export an Excel report at the end of the convention.

## Features

- Artist checkout: "Sold" buttons sized for one-handed use, multi-sell (×2–×5), and
  optimistic updates so it stays responsive on slow convention WiFi.
- Inventory: artists add, edit, and delete their own items, with optional product photos
  (compressed in the browser before upload).
- Sale corrections: mistakes are fixed with an append-only correction entry rather than a
  delete, so the sales record stays intact.
- Admin dashboard: live revenue, items sold, and per-artist breakdowns that update as sales
  come in.
- Excel export: one-click `.xlsx` with a summary sheet, a full chronological sales log,
  and a sheet per artist (per-item breakdown plus that artist's own sales log).
- Error handling: a top-level error boundary and async paths that roll back and show a
  message on network or session failure.

## Tech stack

- Frontend: React 19 + Vite, React Router
- Backend: [Supabase](https://supabase.com) — Postgres, Auth, Realtime, and Storage
- Export: SheetJS (`xlsx`), lazy-loaded so it stays out of the main bundle
- Hosting: Cloudflare Workers (static assets), deployed on push to `main`
- Testing: Vitest (unit) + Playwright (end-to-end against local Supabase)

## Getting started

> [!NOTE]
> The app needs a Supabase project (database schema, auth, and a storage bucket) to run.
> A full setup guide is still to come — for now this covers the local dev loop against an
> existing Supabase project. Sign-in is also gated by a Cloudflare Turnstile captcha, so
> enable Captcha protection (provider Turnstile) in your Supabase Auth settings — otherwise
> every sign-in is rejected. Accounts are admin-created (there is no public sign-up flow), so
> also turn OFF "Allow new users to sign up" in those settings to close that surface.

```bash
# 1. Install dependencies
npm install

# 2. Configure your Supabase credentials
cp .env.example .env.local
# then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start the dev server
npm run dev
```

The database schema lives in [`supabase/migrations/`](supabase/migrations/) and can be applied
to a fresh Supabase project to recreate the tables, triggers, and row-level security policies.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the unit test suite once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests (Playwright; needs local Supabase) |
| `npm run test:e2e:ui` | Run E2E tests in Playwright's interactive UI |
| `npm run lint` | Lint & format check with Biome |
| `npm run lint:fix` | Apply safe Biome lint/format fixes |
| `npm run format` | Format files with Biome |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

## Testing

Two layers, kept separate:

- **Unit (Vitest)** — fast logic tests with Supabase mocked. `npm test`.
- **End-to-end (Playwright)** — drives a real mobile browser against a *local* Supabase
  stack (real migrations, triggers, and RLS), so it exercises the server logic the unit
  tests mock out. Requires Docker, with the local stack running:

  ```bash
  npx playwright install chromium   # first run only — fetches the test browser
  supabase start                    # boots local Postgres/Auth/Realtime (needs Docker)
  npm run test:e2e
  ```

The end-to-end suite runs in CI on every push to `main` and on pull requests, via GitHub
Actions ([`.github/workflows/e2e.yml`](.github/workflows/e2e.yml)) — it boots a local
Supabase stack and runs Playwright, so no secrets are needed.

See [`e2e/README.md`](e2e/README.md) for the full guide — auth setup, test data, and how
the projects are wired.

## Project structure

```
src/
  lib/          Supabase client, image upload, Excel export, formatting
  context/      AuthContext (session, profile, role)
  hooks/        useArtistItems, useAdminData (with realtime)
  components/   ItemCard, AddItemForm, admin cards, route guard, error boundary
  pages/        Login, AdminLogin, ArtistDashboard, AdminDashboard, NotFound
supabase/
  migrations/   SQL schema, triggers, and RLS policies
e2e/            Playwright end-to-end tests (run against local Supabase)
```

## License

[Apache 2.0](LICENSE)
