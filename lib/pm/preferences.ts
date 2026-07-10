import { cookies } from "next/headers";

export const PM_MOBILE_MODE_COOKIE = "pm_mobile_mode";

/** Preferensi tampilan mobile modul PM - toggle manual, tersimpan di cookie (bukan berdasar lebar layar). */
export async function getPmMobileMode(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(PM_MOBILE_MODE_COOKIE)?.value === "1";
}
