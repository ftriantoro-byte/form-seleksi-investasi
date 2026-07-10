import Link from "next/link";
import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole, type AppRole } from "@/lib/supabase/role";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getSummary(
  supabase: SupabaseServerClient,
  userId: string,
  role: AppRole,
): Promise<string | null> {
  if (role === "evaluator") {
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("dibuat_oleh", userId)
      .in("status", ["draft", "menunggu_skoring"]);

    if (!count) return null;
    return `Anda punya ${count} proposal yang belum selesai diisi.`;
  }

  const statusByRole: Partial<Record<AppRole, string>> = {
    manajer: "menunggu_manajer",
    vp: "menunggu_vp",
    direksi: "menunggu_direksi",
  };
  const status = statusByRole[role];
  if (!status) return null;

  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (!count) return null;
  return `Ada ${count} proposal menunggu keputusan Anda.`;
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: forms } = await supabase
    .from("forms")
    .select("id, slug, nama, deskripsi")
    .eq("aktif", true)
    .order("created_at", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getCurrentUserRole() : null;
  const summary = user && role ? await getSummary(supabase, user.id, role) : null;

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <header className="sticky top-0 z-10 border-b border-black/[0.04] bg-[#fbfbfd]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-semibold text-white">
              FI
            </div>
            <span className="text-[15px] font-medium text-zinc-900">
              Form Internal
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-5">
              <Link
                href="/dashboard"
                className="text-[14px] text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Dashboard
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="whitespace-nowrap text-[14px] text-zinc-400 transition-colors hover:text-zinc-900"
                >
                  Keluar
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 sm:px-10 sm:py-20">
        <h1 className="text-[34px] font-semibold tracking-tight text-zinc-900 sm:text-[42px]">
          Form Internal Perusahaan
        </h1>
        <p className="mt-2 text-[17px] text-zinc-500">
          Pilih form yang ingin diisi atau ditinjau.
        </p>

        {summary && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-3.5 text-[14px] text-amber-800">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            {summary}
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {(forms ?? []).map((form) => (
            <Link
              key={form.id}
              href={`/forms/${form.slug}`}
              className="group rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-[17px] font-semibold text-zinc-900">
                  {form.nama}
                </h2>
                <span className="mt-0.5 text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400">
                  &rarr;
                </span>
              </div>
              {form.deskripsi && (
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
                  {form.deskripsi}
                </p>
              )}
            </Link>
          ))}
          {(!forms || forms.length === 0) && (
            <p className="text-[14px] text-zinc-400">Belum ada form yang tersedia.</p>
          )}
        </div>
      </main>
    </div>
  );
}
