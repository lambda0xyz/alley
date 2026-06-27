// Connection details for the local Supabase stack (`supabase start`) used by
// the E2E tests. These are the CLI's fixed local-dev keys — non-secret and
// identical on every machine — so they're safe to commit. If `supabase status`
// ever prints different values, update them here and in .env.test.
export const SUPABASE_URL = 'http://127.0.0.1:54321'

export const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Service role bypasses RLS — only ever used by the test setup (never shipped to
// the browser). This is the well-known local key, not a production secret.
export const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// The artist account the suite signs in as — matches the {identifier}@alley.local
// + PIN scheme from AGENTS.md.
export const TEST_ARTIST = {
  identifier: 'table1',
  pin: '482134',
  displayName: 'table1',
}

// The admin account the admin suite signs in as. Admin auth is plain
// email + password (not the artist name + PIN), and is_admin is flipped on the
// profile via the service-role key in admin.setup.js — the RLS policy blocks a
// user from promoting themselves. Local-only credentials, safe to commit.
export const TEST_ADMIN = {
  email: 'admin@alley.local',
  password: 'admin-test-pw-9271',
  displayName: 'Admin',
}
