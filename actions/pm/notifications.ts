"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";

export async function markNotificationRead(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const notificationId = formData.get("notificationId") as string;

  await supabase.from("pm_notifications").update({ dibaca: true }).eq("id", notificationId);

  redirect("/pm/notifications");
}

export async function markAllNotificationsRead() {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  await supabase
    .from("pm_notifications")
    .update({ dibaca: true })
    .eq("user_id", user.id)
    .eq("dibaca", false);

  redirect("/pm/notifications");
}
