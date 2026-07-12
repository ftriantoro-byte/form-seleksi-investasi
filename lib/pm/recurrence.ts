// Helper murni (tanpa I/O) untuk fitur Task berulang - dipisah dari
// actions/pm/tasks.ts supaya logikanya gampang dibaca/diuji terpisah.

export const RECURRENCE_TYPE_VALUES = ["weekly", "monthly", "custom"] as const;
export type PmRecurrenceType = (typeof RECURRENCE_TYPE_VALUES)[number];

export const RECURRENCE_TYPE_LABEL: Record<PmRecurrenceType, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  custom: "Periode tertentu (hari)",
};

// Parse/format selalu lewat komponen UTC eksplisit (Date.UTC + getUTC*/
// setUTC*), BUKAN `new Date(dateStr + "T00:00:00")` + toISOString() biasa -
// yang terakhir itu diinterpretasi sebagai waktu LOKAL lalu dikonversi ke
// UTC saat toISOString(), yang di timezone UTC+7 (WIB) menggeser tanggal
// mundur satu hari (mis. 13 Jul + 7 hari harusnya 20 Jul, tapi jadi
// tersimpan 19 Jul kalau lewat local-time). Semua di sini murni UTC supaya
// hasilnya sama di server manapun, tidak tergantung timezone proses Node.
function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// interval berarti "setiap N minggu/bulan/hari" tergantung type - satu
// field dipakai ulang untuk ketiganya supaya skema & form tetap sederhana.
export function computeNextDueDate(
  currentDueDate: string,
  type: PmRecurrenceType,
  interval: number,
): string {
  const d = parseDateUTC(currentDueDate);
  const n = Math.max(1, interval);
  if (type === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7 * n);
  } else if (type === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + n);
  } else {
    d.setUTCDate(d.getUTCDate() + n);
  }
  return formatDateUTC(d);
}

// Kalau start_date ikut diisi, geser juga dengan jarak hari yang sama ke
// due_date lama supaya rentang Start->Due Task tetap proporsional tiap
// siklus (bukan disatukan jadi due_date saja).
export function shiftStartDate(
  oldStartDate: string,
  oldDueDate: string,
  newDueDate: string,
): string {
  const deltaMs = parseDateUTC(newDueDate).getTime() - parseDateUTC(oldDueDate).getTime();
  const shifted = new Date(parseDateUTC(oldStartDate).getTime() + deltaMs);
  return formatDateUTC(shifted);
}
