-- ============================================================
-- ALLOW ARTISTS TO DELETE THEIR OWN ITEMS
-- ============================================================
--
-- 0001 restricted item deletion to admins only. The artist UI now offers a
-- "Delete item" action (guarded by a confirmation), so artists need to be
-- able to remove their own items.
--
-- This stays safe on two fronts:
--   1. The sales FK is ON DELETE RESTRICT, so the database physically refuses
--      to delete any item that has sales rows attached — an item that has ever
--      sold (or been corrected) cannot be deleted, only its owner's mistakes
--      with zero history can.
--   2. The policy still scopes deletes to the caller's own rows; admins retain
--      blanket delete via is_admin().

drop policy "items: only admin can delete" on public.items;

create policy "items: artists delete their own or admin deletes all"
  on public.items for delete
  using (artist_id = auth.uid() or public.is_admin());
