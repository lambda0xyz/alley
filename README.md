<div align="center">
  <img src="public/logo.png" alt="alley" width="200" />

  <p><strong>A mobile-first inventory & sales tracker for artists at anime/doujin conventions.</strong></p>
</div>

---

Artists log in on their phones and tap to mark items sold from a busy table. Admins watch a
live dashboard across every artist and export a formatted Excel report when the convention
wraps up.

## Features

- **Fast artist checkout** — large thumb-friendly "Sold" buttons, multi-sell (×2–×5), and
  optimistic UI that feels instant on flaky convention WiFi.
- **Inventory management** — artists add, edit, and delete their own items, with optional
  product photos (compressed client-side before upload).
- **Sale corrections** — mistakes are fixed with an append-only correction entry, never a
  silent delete, so the sales record stays an honest audit trail.
- **Live admin dashboard** — real-time revenue, items sold, and per-artist breakdowns that
  update the moment a sale is recorded.
- **Excel export** — one-click `.xlsx` report with a summary sheet plus a sheet per artist.
- **Resilient by design** — top-level error boundary and hardened async paths that roll back
  and show a friendly message on network or session failure.

## Tech stack

- **Frontend:** React 19 + Vite, React Router
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Realtime, and Storage
- **Export:** SheetJS (`xlsx`), lazy-loaded so it stays out of the main bundle
- **Hosting:** Cloudflare Workers (static assets), auto-deployed on push to `main`

## Getting started

> [!NOTE]
> The app needs a Supabase project (database schema, auth, and a storage bucket) to run.
> A full self-hosting guide is coming — for now this covers the local dev loop against an
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
