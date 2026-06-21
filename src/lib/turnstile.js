// Cloudflare Turnstile site key. This value is public (it ships in the page),
// so it's safe to commit. Override per-environment via VITE_TURNSTILE_SITE_KEY.
export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADosbUzaNxJQBJnR'
