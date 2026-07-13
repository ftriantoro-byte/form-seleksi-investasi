import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMeeting } from "@/actions/pm/meetings";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";

type PmMeeting = { id: string; judul: string; meeting_date: string | null };
type PmSpace = { id: string; nama: string };
type PmWorkspaceMemberProfile = { user_id: string; email: string };

export default async function MeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId } = await params;
  const { error } = await searchParams;

  // Akses modul PM sudah dicek di app/pm/layout.tsx.
  const supabase = await createClient();

  const [{ data: workspace }, { data: meetingsRaw }, { data: spacesRaw }, { data: anggotaRaw }] =
    await Promise.all([
      supabase.from("pm_workspaces").select("id, nama").eq("id", workspaceId).single(),
      supabase
        .from("pm_meetings")
        .select("id, judul, meeting_date")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase.from("pm_spaces").select("id, nama").eq("workspace_id", workspaceId),
      supabase.rpc("pm_workspace_member_profiles", { p_workspace_id: workspaceId }),
    ]);

  if (!workspace) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">
          Workspace tidak ditemukan (atau Anda tidak berwenang melihatnya).
        </p>
      </FormPageShell>
    );
  }

  const meetings = (meetingsRaw ?? []) as PmMeeting[];
  const spaces = (spacesRaw ?? []) as PmSpace[];
  const anggota = (anggotaRaw ?? []) as PmWorkspaceMemberProfile[];

  return (
    <FormPageShell maxWidth="max-w-3xl">
      <FormPageHeader
        title="Notulensi Meeting"
        subtitle={`Workspace ${workspace.nama}`}
        backHref={`/pm/${workspaceId}`}
        backLabel="Kembali ke Workspace"
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Riwayat Meeting</h3>
        <ul className="mt-4 space-y-2">
          {meetings.map((m) => (
            <li key={m.id}>
              <Link
                href={`/pm/${workspaceId}/meetings/${m.id}`}
                className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-[14px] text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <span className="font-medium">{m.judul}</span>
                <span className="text-[12px] text-zinc-400">{m.meeting_date ?? "-"}</span>
              </Link>
            </li>
          ))}
          {meetings.length === 0 && (
            <li className="text-[14px] text-zinc-400">Belum ada Meeting.</li>
          )}
        </ul>
      </div>

      <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Buat Meeting baru</h3>
        <form action={createMeeting} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="sm:col-span-2">
            <FormField label="Judul Meeting" name="judul" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              Tanggal (opsional)
            </label>
            <input
              type="date"
              name="meetingDate"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-zinc-500">
              Space terkait (opsional)
            </label>
            <select
              name="spaceId"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">- Tidak terkait Space tertentu -</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[13px] font-medium text-zinc-500">Peserta</label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {anggota.map((a) => (
                <label
                  key={a.user_id}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-[13px] text-zinc-700"
                >
                  <input type="checkbox" name="attendeeIds" value={a.user_id} />
                  {a.email}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Buat Meeting
            </button>
          </div>
        </form>
      </div>
    </FormPageShell>
  );
}
