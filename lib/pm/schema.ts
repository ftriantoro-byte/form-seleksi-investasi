import { z } from "zod";

export const workspaceSchema = z.object({
  nama: z.string().min(1, "Nama Workspace wajib diisi"),
  deskripsi: z.string().optional(),
});

export const spaceSchema = z.object({
  nama: z.string().min(1, "Nama Space wajib diisi"),
  deskripsi: z.string().optional(),
});

export const listSchema = z.object({
  nama: z.string().min(1, "Nama List wajib diisi"),
  deskripsi: z.string().optional(),
});

export const TASK_STATUS_VALUES = ["to_do", "in_progress", "in_review", "done"] as const;
export const TASK_PRIORITY_VALUES = ["urgent", "high", "normal", "low"] as const;

export const taskSchema = z.object({
  judul: z.string().min(1, "Judul Task wajib diisi"),
  deskripsi: z.string().optional(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.enum(TASK_PRIORITY_VALUES).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const commentSchema = z.object({
  konten: z.string().min(1, "Komentar tidak boleh kosong"),
});

export const checklistItemSchema = z.object({
  konten: z.string().min(1, "Item checklist tidak boleh kosong"),
});
