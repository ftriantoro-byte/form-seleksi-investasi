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
