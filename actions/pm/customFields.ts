"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { customFieldDefinitionSchema } from "@/lib/pm/schema";

function listPath(workspaceId: string, spaceId: string, listId: string) {
  return `/pm/${workspaceId}/${spaceId}/${listId}`;
}

export async function createFieldDefinition(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const path = listPath(workspaceId, spaceId, listId);

  const parsed = customFieldDefinitionSchema.safeParse({
    nama: formData.get("nama"),
    type: formData.get("type"),
    opsi: formData.get("opsi") || undefined,
  });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${path}?error=${encodeURIComponent(pesan)}`);
  }

  const opsiArray =
    parsed.data.type === "select" && parsed.data.opsi
      ? parsed.data.opsi
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

  const { error } = await supabase.from("pm_custom_field_definitions").insert({
    list_id: listId,
    nama: parsed.data.nama,
    type: parsed.data.type,
    opsi: opsiArray,
  });

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}

export async function deleteFieldDefinition(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const fieldDefinitionId = formData.get("fieldDefinitionId") as string;
  const path = listPath(workspaceId, spaceId, listId);

  const { error } = await supabase
    .from("pm_custom_field_definitions")
    .delete()
    .eq("id", fieldDefinitionId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
