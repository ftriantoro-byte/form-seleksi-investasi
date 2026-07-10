"use server";

import { cookies } from "next/headers";
import { PM_MOBILE_MODE_COOKIE } from "@/lib/pm/preferences";

export async function setPmMobileMode(enabled: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(PM_MOBILE_MODE_COOKIE, enabled ? "1" : "0", {
    path: "/pm",
    maxAge: 60 * 60 * 24 * 365,
  });
}
