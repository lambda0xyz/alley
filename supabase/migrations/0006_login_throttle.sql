-- ============================================================
-- PER-ACCOUNT LOGIN THROTTLE  (graceful, increasing cooldown)
-- ============================================================
--
-- Slows down repeated WRONG password/PIN attempts on a single account with
-- an increasing cooldown. Wired to Supabase's "Password Verification Attempt"
-- auth hook, which GoTrue calls AFTER every password check — so unlike a
-- counter in React state, the browser cannot bypass it.
--
-- DESIGN CHOICE — GRACEFUL lockout:
--   A CORRECT password ALWAYS succeeds and wipes the counter, even mid
--   cooldown. The cooldown only ever blocks further WRONG guesses. This is
--   deliberate: an attacker who only knows the table number / identifier can
--   NOT lock the real artist out of their own account during a convention
--   (no lockout-as-denial-of-service). Trade-off: because this hook runs
--   AFTER the password is verified, the cooldown is account-level friction
--   ON TOP OF the real first-line defences (Cloudflare Turnstile + Supabase's
--   built-in per-IP rate limiting), not a replacement for them. Its unique
--   value is catching attempts on one account from many rotating IPs, which
--   per-IP limits miss.
--
-- Covers BOTH logins: the artist PIN and the admin password are both the
-- account password, so both go through this hook.
--
-- >>> REQUIRES TEAM / ENTERPRISE PLAN — currently DORMANT <<<
--   The "Password Verification Attempt" hook is greyed out on Free/Pro
--   (Dashboard > Authentication > Hooks shows it under "Team or Enterprise
--   Plan required"). Until the project is on a qualifying plan, this table +
--   function are INERT: nothing ever calls the function, so applying this
--   migration is harmless but has no effect. The moment you upgrade, enable:
--   Dashboard > Authentication > Hooks > "Password Verification Attempt"
--   > Enable, type "Postgres", select public.password_verification_attempt
--   and the throttle goes live with no code changes.
-- ============================================================


-- One row per user, created lazily on the first failure.
create table public.login_throttle (
  user_id        uuid        primary key references auth.users on delete cascade,
  failed_count   integer     not null default 0,
  last_failed_at timestamptz,
  locked_until   timestamptz
);

-- The hook executes as the supabase_auth_admin role. Lock the table to that
-- role only. RLS on + no public policy means anon/authenticated (the browser)
-- can never see or touch it; the policy below lets the auth server through.
-- (supabase_auth_admin is not the table owner, so RLS still applies to it —
-- hence the explicit policy rather than relying on a bypass.)
alter table public.login_throttle enable row level security;

create policy "login_throttle: auth admin only"
  on public.login_throttle
  as permissive
  for all
  to supabase_auth_admin
  using (true)
  with check (true);

grant usage on schema public to supabase_auth_admin; -- usually already granted; harmless
grant all on public.login_throttle to supabase_auth_admin;


-- The hook. GoTrue sends { user_id, valid }; we return { decision, message }.
-- decision is "continue" (let GoTrue proceed normally) or "reject" (block with
-- our message). We escalate a cooldown on consecutive wrong attempts and clear
-- it the instant the right password shows up.
create or replace function public.password_verification_attempt(event jsonb)
returns jsonb as $$
declare
  uid          uuid    := (event->>'user_id')::uuid;
  pw_valid     boolean := (event->>'valid')::boolean;
  rec          public.login_throttle;
  free_tries   constant int := 4;   -- this many wrong tries before any cooldown
  decay        constant interval := interval '15 minutes'; -- quiet gap that resets a streak
  cooldown_sec int;
  wait_sec     int;
begin
  -- No user to attribute the attempt to (e.g. unknown email): nothing to
  -- throttle — let GoTrue answer with its normal generic error.
  if uid is null then
    return jsonb_build_object('decision', 'continue');
  end if;

  select * into rec from public.login_throttle where user_id = uid;

  -- Correct password: always let them in and wipe the slate. THIS is what
  -- makes the throttle impossible to weaponise against the real user.
  if pw_valid then
    if found then
      delete from public.login_throttle where user_id = uid;
    end if;
    return jsonb_build_object('decision', 'continue');
  end if;

  -- ---- from here the password was WRONG ----

  -- Decay: a wrong-guess streak that's gone quiet long enough starts over, so
  -- occasional fat-fingering across a long shift never accrues into a lock.
  if found
     and rec.last_failed_at is not null
     and rec.last_failed_at < now() - decay
     and (rec.locked_until is null or rec.locked_until <= now()) then
    update public.login_throttle
      set failed_count = 0, locked_until = null
      where user_id = uid;
    rec.failed_count := 0;
    rec.locked_until := null;
  end if;

  -- Still inside an active cooldown from earlier wrong attempts: refuse and
  -- say how long to wait. Doesn't burn extra escalation (count is untouched).
  if found and rec.locked_until is not null and rec.locked_until > now() then
    wait_sec := ceil(extract(epoch from (rec.locked_until - now())));
    return jsonb_build_object(
      'decision', 'reject',
      'message',  'Too many attempts. Try again in ' || public._throttle_label(wait_sec) || '.'
    );
  end if;

  -- Record this wrong attempt.
  insert into public.login_throttle (user_id, failed_count, last_failed_at)
  values (uid, 1, now())
  on conflict (user_id) do update
    set failed_count   = login_throttle.failed_count + 1,
        last_failed_at = now()
  returning * into rec;

  -- Under the free allowance: behave like a normal wrong password.
  if rec.failed_count <= free_tries then
    return jsonb_build_object('decision', 'continue');
  end if;

  -- Over it: arm an increasing cooldown — 30s, 60s, 120s, ... doubling each
  -- extra failure, capped at 15 minutes (exponent capped to avoid overflow).
  cooldown_sec := least(
    900,
    (30 * power(2, least(rec.failed_count - free_tries - 1, 16)))::int
  );

  update public.login_throttle
    set locked_until = now() + make_interval(secs => cooldown_sec)
    where user_id = uid;

  return jsonb_build_object(
    'decision', 'reject',
    'message',  'Too many attempts. Try again in ' || public._throttle_label(cooldown_sec) || '.'
  );
end;
$$ language plpgsql;


-- Small helper so messages read "2 minutes" instead of "120 seconds".
create or replace function public._throttle_label(secs int)
returns text as $$
  select case
    when secs >= 60 then ceil(secs / 60.0)::int || ' minute' || case when ceil(secs / 60.0)::int = 1 then '' else 's' end
    else secs || ' second' || case when secs = 1 then '' else 's' end
  end;
$$ language sql immutable;


-- Only the auth server may run the hook; never the browser roles.
grant execute on function public.password_verification_attempt to supabase_auth_admin;
grant execute on function public._throttle_label              to supabase_auth_admin;
revoke execute on function public.password_verification_attempt(jsonb) from anon, authenticated, public;
revoke execute on function public._throttle_label(int)              from anon, authenticated, public;
