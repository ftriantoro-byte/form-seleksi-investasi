"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePmAccess } from "@/lib/pm/access";
import { templateSchema } from "@/lib/pm/schema";

const PM_LAYOUT_PATH = "/pm";

function templatesPath(workspaceId: string) {
  return `/pm/${workspaceId}/templates`;
}

export async function saveListAsTemplate(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const workspaceId = formData.get("workspaceId") as string;
  const spaceId = formData.get("spaceId") as string;
  const listId = formData.get("listId") as string;
  const listPath = `/pm/${workspaceId}/${spaceId}/${listId}`;

  const parsed = templateSchema.safeParse({ nama: formData.get("nama") });

  if (!parsed.success) {
    const pesan = parsed.error.issues.map((issue) => issue.message).join(", ");
    return redirect(`${listPath}?error=${encodeURIComponent(pesan)}`);
  }

  const [{ data: list }, { data: fieldDefinitions }] = await Promise.all([
    supabase.from("pm_lists").select("custom_status_labels").eq("id", listId).single(),
    supabase
      .from("pm_custom_field_definitions")
      .select("nama, type, opsi, urutan")
      .eq("list_id", listId)
      .order("urutan", { ascending: true }),
  ]);

  const { error } = await supabase.from("pm_list_templates").insert({
    workspace_id: workspaceId,
    nama: parsed.data.nama,
    custom_status_labels: list?.custom_status_labels ?? null,
    custom_fields: fieldDefinitions ?? [],
    created_by: user.id,
  });

  if (error) {
    return redirect(`${listPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(listPath);
}

export async function createListFromTemplate(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const templateId = formData.get("templateId") as string;
  const spaceId = formData.get("spaceId") as string;
  const nama = (formData.get("nama") as string)?.trim();
  const path = templatesPath(workspaceId);

  if (!nama || !spaceId) {
    return redirect(
      `${path}?error=${encodeURIComponent("Nama List baru dan Space tujuan wajib diisi.")}`,
    );
  }

  const { data: template } = await supabase
    .from("pm_list_templates")
    .select("custom_status_labels, custom_fields")
    .eq("id", templateId)
    .single();

  if (!template) {
    return redirect(`${path}?error=${encodeURIComponent("Template tidak ditemukan.")}`);
  }

  const { data: list, error } = await supabase
    .from("pm_lists")
    .insert({
      space_id: spaceId,
      nama,
      custom_status_labels: template.custom_status_labels,
    })
    .select("id")
    .single();

  if (error || !list) {
    return redirect(`${path}?error=${encodeURIComponent(error?.message ?? "Gagal membuat List.")}`);
  }

  const fieldDefinitions = (template.custom_fields ?? []) as Array<{
    nama: string;
    type: string;
    opsi: string[] | null;
    urutan: number;
  }>;

  if (fieldDefinitions.length > 0) {
    await supabase.from("pm_custom_field_definitions").insert(
      fieldDefinitions.map((def) => ({
        list_id: list.id,
        nama: def.nama,
        type: def.type,
        opsi: def.opsi,
        urutan: def.urutan,
      })),
    );
  }

  revalidatePath(PM_LAYOUT_PATH, "layout");
  redirect(`/pm/${workspaceId}/${spaceId}/${list.id}`);
}

export async function deleteTemplate(formData: FormData) {
  await requirePmAccess();

  const supabase = await createClient();
  const workspaceId = formData.get("workspaceId") as string;
  const templateId = formData.get("templateId") as string;
  const path = templatesPath(workspaceId);

  const { error } = await supabase.from("pm_list_templates").delete().eq("id", templateId);

  if (error) {
    return redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(path);
}
