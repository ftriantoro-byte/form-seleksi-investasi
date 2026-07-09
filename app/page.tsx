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
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Form Internal Perusahaan</h1>
          <p className="mt-1 text-sm text-gray-600">
            Pilih form yang ingin diisi atau ditinjau.
          </p>
        </div>
        {user && (
          <form action={logout}>
            <button
              type="submit"
              className="whitespace-nowrap text-sm text-gray-500 hover:text-gray-900"
            >
              Keluar ({user.email})
            </button>
          </form>
        )}
      </div>

      {summary && (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summary}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(forms ?? []).map((form) => (
          <Link
            key={form.id}
            href={`/forms/${form.slug}`}
            className="rounded-lg border border-gray-200 p-5 transition-colors hover:border-gray-400"
          >
            <h2 className="font-medium">{form.nama}</h2>
            {form.deskripsi && (
              <p className="mt-1 text-sm text-gray-600">{form.deskripsi}</p>
            )}
          </Link>
        ))}
        {(!forms || forms.length === 0) && (
          <p className="text-sm text-gray-500">Belum ada form yang tersedia.</p>
        )}
      </div>
    </main>
  );
}
