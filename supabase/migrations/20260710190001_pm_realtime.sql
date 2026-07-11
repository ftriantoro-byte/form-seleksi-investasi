-- Modul PM tahap B.3: Real-time sync via Supabase Realtime (Postgres
-- Changes) - lihat PM-MODULE-SPEC.md §5. Tabel harus didaftarkan ke
-- publication supabase_realtime supaya perubahan INSERT/UPDATE/DELETE
-- di-broadcast ke client yang subscribe. RLS yang sudah ada (pm_can_access_*)
-- otomatis berlaku untuk Postgres Changes juga - tidak perlu policy terpisah.

alter publication supabase_realtime add table pm_tasks;
alter publication supabase_realtime add table pm_comments;
alter publication supabase_realtime add table pm_checklist_items;
