import { createClient } from "@/lib/supabase/server";

export type PmRole = "admin" | "member";

/** null jika belum login atau tidak ada baris pm_members untuknya (bukan anggota modul PM). */
export async function getPmMembership(): Promise<PmRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("pm_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (data?.role as PmRole | undefined) ?? null;
}

/**
 * Dipakai di awal Server Component/Server Action modul PM. Lempar error jika
 * user saat ini bukan anggota pm_members sama sekali.
 */
export async function requirePmAccess(): Promise<PmRole> {
  const role = await getPmMembership();

  if (!role) {
    throw new Error("Akses ditolak: Anda bukan anggota modul Task Management.");
  }

  return role;
}

/** Dipakai untuk aksi admin-only modul PM (kelola anggota, hapus Workspace). */
export async function requirePmAdmin(): Promise<PmRole> {
  const role = await requirePmAccess();

  if (role !== "admin") {
    throw new Error("Akses ditolak: aksi ini hanya untuk admin modul Task Management.");
  }

  return role;
}
