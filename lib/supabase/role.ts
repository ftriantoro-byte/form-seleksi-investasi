import { createClient } from "@/lib/supabase/server";

export type AppRole = "evaluator" | "manajer" | "vp" | "direksi" | "admin";

/** null jika belum login atau belum ada baris user_roles untuknya. */
export async function getCurrentUserRole(): Promise<AppRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (data?.role as AppRole | undefined) ?? null;
}

/**
 * Dipakai di awal Server Action / Server Component yang perlu dibatasi role
 * tertentu. Lempar error jika role user saat ini tidak termasuk yang diizinkan.
 */
export async function requireRole(...allowed: AppRole[]): Promise<AppRole> {
  const role = await getCurrentUserRole();

  if (!role || !allowed.includes(role)) {
    throw new Error("Akses ditolak: role Anda tidak berwenang untuk aksi ini.");
  }

  return role;
}
