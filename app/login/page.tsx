import { login } from "@/actions/auth";
import { FormField } from "@/components/ui/FormField";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fbfbfd] px-6">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-semibold text-white shadow-sm">
            FI
          </div>
          <h1 className="mt-5 text-[28px] font-semibold tracking-tight text-zinc-900">
            Masuk
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-500">
            Form Internal Perusahaan &mdash; akun dibuat oleh admin.
            <br />
            Hubungi admin jika Anda belum punya akun.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_2px_24px_rgba(0,0,0,0.05)]">
          {error && (
            <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
              {error}
            </p>
          )}

          <form action={login} className="flex flex-col gap-4">
            <FormField label="Email" name="email" type="email" autoComplete="email" />
            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
            />

            <button
              type="submit"
              className="mt-2 rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98]"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
