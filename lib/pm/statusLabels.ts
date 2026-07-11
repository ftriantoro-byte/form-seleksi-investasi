import { TASK_STATUS_LABEL } from "@/lib/pm/labels";
import { TASK_STATUS_VALUES } from "@/lib/pm/schema";

export type StatusLabelOverrides = Partial<Record<(typeof TASK_STATUS_VALUES)[number], string>>;

/** Gabungkan label baku dengan override per-List (B.6) - key/warna badge tetap sama, cuma teksnya beda. */
export function mergeStatusLabels(
  overrides: StatusLabelOverrides | null | undefined,
): Record<string, string> {
  return { ...TASK_STATUS_LABEL, ...(overrides ?? {}) };
}
