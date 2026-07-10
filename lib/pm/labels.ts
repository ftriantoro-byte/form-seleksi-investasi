export const TASK_STATUS_LABEL: Record<string, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const TASK_STATUS_BADGE_KELAS: Record<string, string> = {
  to_do: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const TASK_PRIORITY_BADGE_KELAS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-zinc-100 text-zinc-600",
  low: "bg-zinc-50 text-zinc-400",
};
