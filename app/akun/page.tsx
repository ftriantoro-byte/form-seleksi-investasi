import { createClient } from "@/lib/supabase/server";
import { changePassword } from "@/actions/auth";
import { FormPageShell } from "@/components/ui/FormPageShell";
import { FormPageHeader } from "@/components/ui/FormPageHeader";
import { FormField } from "@/components/ui/FormField";

export default async function AkunPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <FormPageShell maxWidth="max-w-xl">
        <p className="text-[15px] text-zinc-500">Anda perlu masuk untuk melihat halaman ini.</p>
      </FormPageShell>
    );
  }

  return (
    <FormPageShell maxWidth="max-w-xl">
      <FormPageHeader title="Akun" backHref="/" backLabel="Kembali ke Beranda" />

      <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Email</h3>
        <p className="mt-1.5 text-[15px] text-zinc-600">{user.email}</p>
      </div>

      <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
        <h3 className="text-[14px] font-semibold text-zinc-900">Ganti Password</h3>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-xl bg-green-50 px-3.5 py-2.5 text-[13px] text-green-700">
            Password berhasil diganti.
          </p>
        )}

        <form action={changePassword} className="mt-4 grid grid-cols-1 gap-4">
          <FormField label="Password Saat Ini" name="currentPassword" type="password" />
          <FormField label="Password Baru" name="newPassword" type="password" />
          <FormField
            label="Konfirmasi Password Baru"
            name="confirmPassword"
            type="password"
          />
          <button
            type="submit"
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Ganti Password
          </button>
        </form>
      </div>
    </FormPageShell>
  );
}
