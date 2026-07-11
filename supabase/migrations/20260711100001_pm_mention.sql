-- Modul PM tahap B.4: @mention sederhana.
--
-- Tanpa autocomplete (belum ada rich text editor di aplikasi ini) - mention
-- ditulis manual sebagai teks: "@email@domain.com" untuk anggota Workspace,
-- "#[Judul Task]" untuk Task lain di List yang sama. Parsing & linkifikasi
-- dilakukan di application layer (lib/pm/mentions.tsx), bukan di database.
-- Mention user memicu notifikasi baru - butuh nilai enum tambahan.

alter type pm_notification_type add value 'mention';
