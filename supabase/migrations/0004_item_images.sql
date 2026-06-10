-- ============================================================
-- ITEM IMAGES — STORAGE BUCKET POLICIES
-- ============================================================
--
-- items.image_url has existed since 0001 but nothing wrote to it. The artist
-- UI now uploads a product photo when adding/editing an item. Photos live in a
-- public Storage bucket named 'item-images' (create it in the dashboard, or via
-- the storage API, with public = true) and items.image_url stores the public
-- CDN URL.
--
-- A PUBLIC bucket is deliberate: these are product photos meant to be seen by
-- anyone viewing a dashboard, and public objects get a stable CDN URL with no
-- per-render signing. RLS below still governs WRITES — reads are open.
--
-- Path convention: '{auth.uid}/{random}.jpg'. The foldername check ties every
-- object to its uploader's folder, so artists can't overwrite each other's
-- images even though the bucket is world-readable.
--
-- NOTE: this migration only creates the policies. The bucket itself must exist
-- first (Storage > New bucket > name 'item-images', Public ON).

-- Public read: the bucket is public, but make the SELECT policy explicit so the
-- intent is visible alongside the write rules.
create policy "item images are publicly readable"
  on storage.objects for select
  using ( bucket_id = 'item-images' );

create policy "artists upload their own item images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artists update their own item images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artists delete their own item images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
