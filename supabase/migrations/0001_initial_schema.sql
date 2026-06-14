-- ============================================================
-- TABLES
-- ============================================================

-- Every user who signs up gets a matching profile row.
-- We store display names and the admin flag here rather than
-- in Supabase's auth.users table, which we don't control.
create table public.profiles (
  -- auth.users is Supabase's internal auth table.
  -- This foreign key ties each profile to exactly one auth account.
  -- on delete cascade means: if the auth account is deleted, the profile goes too.
  id           uuid references auth.users on delete cascade primary key,
  display_name text        not null,
  is_admin     boolean     not null default false,
  created_at   timestamptz not null default now()
);


create table public.items (
  id        uuid primary key default gen_random_uuid(),

  -- Which artist owns this item. Cascades so if the profile is removed,
  -- their items are removed too.
  artist_id uuid references public.profiles(id) on delete cascade not null,

  name        text           not null,
  description text,

  -- numeric(10, 2) = up to 10 digits total, 2 after the decimal.
  -- Correct type for money. Never use float for currency.
  price numeric(10, 2) not null default 0,

  -- quantity_total: how many the artist brought to the convention. Set once.
  -- quantity_remaining: decremented automatically by a trigger on each sale.
  -- Keeping both lets you calculate sold = total - remaining at any time
  -- without summing the entire sales table.
  quantity_total     integer not null default 0,
  quantity_remaining integer not null default 0,

  image_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Database-level guardrail. Postgres will reject any insert or update
  -- that would leave remaining < 0 (oversold) or remaining > total (nonsense).
  -- This protects you even if the app code has a bug.
  constraint qty_check check (
    quantity_remaining >= 0
    and quantity_remaining <= quantity_total
  )
);


create table public.sales (
  id      uuid primary key default gen_random_uuid(),

  -- on delete restrict is intentional and different from the tables above.
  -- It means: you CANNOT delete an item that has sales attached to it.
  -- This protects your accounting records from accidental data loss.
  item_id uuid references public.items(id) on delete restrict not null,

  -- Normally 1, but allows recording "sold 3 prints at once" as a single row.
  quantity_sold integer     not null default 1,
  sold_at       timestamptz not null default now(),

  -- Free text for corrections, e.g. "refund: customer changed mind".
  notes text,

  constraint qty_sold_positive check (quantity_sold > 0)
);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- TRIGGER 1: auto-create a profile row when a new user signs up.
--
-- Supabase fires auth events when users are created, but our app
-- works with public.profiles, not auth.users directly.
-- This trigger bridges the gap automatically so we never have
-- to do it manually from the frontend.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- new.raw_user_meta_data is JSON passed at signup time.
    -- We'll send display_name from the frontend registration form.
    -- coalesce falls back to email if it wasn't provided.
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;
-- security definer: the function runs with the privileges of its creator
-- (your DB owner), not the calling user. Required here because new users
-- don't yet have permission to insert into profiles themselves.

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- TRIGGER 2: auto-decrement stock when a sale is inserted.
--
-- The frontend only ever inserts a row into sales.
-- This trigger handles the stock update atomically on the DB side,
-- meaning both operations either succeed together or fail together.
-- If the decrement would violate qty_check (stock goes below 0),
-- Postgres rejects the entire transaction — the sale is not recorded.
create or replace function public.handle_sale_insert()
returns trigger as $$
begin
  update public.items
  set quantity_remaining = quantity_remaining - new.quantity_sold
  where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_sale_created
  after insert on public.sales
  for each row execute function public.handle_sale_insert();


-- TRIGGER 3: keep updated_at accurate on items.
--
-- Postgres doesn't maintain this automatically.
-- The trigger fires before any update and overwrites updated_at with now(),
-- so the app never needs to remember to send this field.
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on public.items
  for each row execute function public.update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
--
-- RLS means every query is automatically filtered based on who
-- is making the request. Without a matching policy, a row is
-- invisible and unwritable — the default is deny-all.
-- This replaces backend authorization logic you'd otherwise
-- have to write and maintain yourself.

alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.sales    enable row level security;


-- Helper function used inside policies below.
-- Centralising the admin check here means if you ever change
-- how admin status works, you change it in one place.
-- stable = Postgres can cache the result within a single query,
-- which matters when the function is called once per row in a policy.
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false  -- returns false if the user has no profile yet, rather than null
  );
$$ language sql security definer stable;


-- PROFILES policies

-- Artists can read their own profile. Admins can read all profiles
-- (needed for the admin dashboard to show artist names).
create policy "profiles: read own or admin reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own display_name only"
  on public.profiles for update
  using (id = auth.uid())  -- can only target your own row
  with check (
    id = auth.uid()
    -- Prevents a user from flipping their own is_admin to true.
    -- This re-reads the current DB value and asserts it hasn't changed.
    and is_admin = (select is_admin from public.profiles where id = auth.uid())
  );


-- ITEMS policies

create policy "items: read own or admin reads all"
  on public.items for select
  using (artist_id = auth.uid() or public.is_admin());

-- artist_id must equal the logged-in user.
-- with check applies to the row being written, using() to the row being targeted.
-- For inserts there's no existing row, so only with check applies.
create policy "items: artists insert their own"
  on public.items for insert
  with check (artist_id = auth.uid());

create policy "items: artists update their own"
  on public.items for update
  using    (artist_id = auth.uid())
  with check (artist_id = auth.uid());

-- Artists cannot delete their own items. Only admins can.
-- This prevents accidental deletion of items that may have sales attached
-- (though on delete restrict would also block that at the DB level).
create policy "items: only admin can delete"
  on public.items for delete
  using (public.is_admin());


-- SALES policies

-- Artists can see sales for their own items. Admins see all.
-- The subquery checks ownership by joining through items.
create policy "sales: read own items sales or admin reads all"
  on public.sales for select
  using (
    public.is_admin() or
    exists (
      select 1 from public.items
      where items.id    = sales.item_id
        and items.artist_id = auth.uid()
    )
  );

-- An artist can only record a sale against an item they own.
-- Prevents artist A from decrementing artist B's stock.
create policy "sales: artists insert for their own items"
  on public.sales for insert
  with check (
    exists (
      select 1 from public.items
      where items.id    = item_id
        and items.artist_id = auth.uid()
    )
  );

-- No update or delete policies on sales are defined.
-- Absence of a policy = operation is denied for everyone, including admins.
-- Sales are append-only. To correct a mistake (e.g. accidental double-tap),
-- insert a new sale row with a negative quantity and a note explaining why.
-- This preserves a full audit trail, the same way accounting journals work.


-- ============================================================
-- POST-SIGNUP: MAKE YOURSELF ADMIN
-- ============================================================
--
-- Run this once after you first sign up through the app.
-- Find your UUID in the Supabase dashboard under Authentication > Users.
-- Admin status is never writable from the client — the RLS policy above blocks it.
--
-- Not run as part of this migration: the UUID is per-environment, and a live
-- UPDATE here would fail the migration (id is uuid; the placeholder is not).
-- After signing up, paste this into the SQL editor with your real UUID:
--
--   update public.profiles
--   set is_admin = true
--   where id = 'your-user-uuid-here';