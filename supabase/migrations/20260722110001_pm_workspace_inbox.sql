-- Time-boxing level Workspace (susulan permintaan user): "task bisa
-- ditambahkan tanpa mengalokasikan folder/list terlebih dahulu". Skema
-- pm_tasks.list_id TETAP not null (tidak diubah - Task selalu perlu List
-- sbg "rumah"nya, konsisten dgn seluruh fitur lain: custom field, status
-- label, automasi, Board/Calendar/Gantt semua di-scope per List) - jalan
-- keluarnya BUKAN longgarkan constraint itu, tapi sediakan List "Inbox"
-- yg di-auto-provision sekali per Workspace sbg tujuan default quick-add
-- saat user belum/tidak mau pilih List spesifik. User bisa rapikan
-- belakangan lewat fitur "Pindahkan ke List" yg sudah ada (moveTask).
alter table pm_workspaces add column inbox_list_id uuid references pm_lists(id) on delete set null;
