-- ============================================================
-- ALLOW SALE CORRECTIONS
-- ============================================================
--
-- The initial schema documented corrections as "insert a new sale row
-- with a negative quantity and a note" (see 0001, SALES policies comment),
-- but the qty_sold_positive constraint (quantity_sold > 0) made that
-- impossible. This migration relaxes the constraint to allow negative
-- quantities while still forbidding a meaningless zero-quantity row.
--
-- A negative sale flows through the existing on_sale_created trigger:
--   quantity_remaining = quantity_remaining - new.quantity_sold
-- so a negative quantity_sold INCREASES remaining (adds stock back).
-- The items.qty_check constraint still guards against over-correcting
-- past quantity_total, so a correction can never push remaining above
-- what the artist originally brought.

alter table public.sales
  drop constraint qty_sold_positive;

alter table public.sales
  add constraint qty_sold_nonzero check (quantity_sold <> 0);

-- Artists need to be able to read corrections back; the existing select
-- and insert policies already cover negative rows since they don't
-- inspect the sign of quantity_sold. No policy change required.
