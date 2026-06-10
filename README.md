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
- Excel export: one-click `.xlsx` with a summary sheet plus a sheet per artist.
- Error handling: a top-level error boundary and async paths that roll back and show a
  message on network or session failure.

## Tech stack

- Frontend: React 19 + Vite, React Router
- Backend: [Supabase](https://supabase.com) — Postgres, Auth, Realtime, and Storage
- Export: SheetJS (`xlsx`), lazy-loaded so it stays out of the main bundle
- Hosting: Cloudflare Workers (static assets), deployed on push to `main`

## Getting started

> [!NOTE]
> The app needs a Supabase project (database schema, auth, and a storage bucket) to run.
> A full setup guide is still to come — for now this covers the local dev loop against an
> existing Supabase project.

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
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

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
```

## License

[Apache 2.0](LICENSE)
