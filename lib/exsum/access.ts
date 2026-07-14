import { createClient } from "@/lib/supabase/server";

/** true jika user saat ini terdaftar di exsum_editors (boleh tulis laporan Exsum). */
export async function isExsumEditor(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("exsum_editors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return Boolean(data);
}

/** Dipakai di awal Server Action Executive Summary yang mengubah data. */
export async function requireExsumEditor(): Promise<void> {
  const editor = await isExsumEditor();

  if (!editor) {
    throw new Error("Akses ditolak: Anda tidak terdaftar sebagai editor Executive Summary.");
  }
}
