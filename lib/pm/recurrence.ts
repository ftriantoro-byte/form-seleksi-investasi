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

const MS_PER_DAY = 86_400_000;

// Proyeksi kejadian MASA DEPAN Task berulang dalam rentang [rangeStart,
// rangeEnd] (inclusive, "YYYY-MM-DD") - MURNI utk tampilan (PmTimeBoxView),
// TIDAK mengubah data apapun. Model dasar TETAP 1 baris per Task
// (due_date cuma benar-benar pindah saat siklus SEBELUMNYA ditandai Done -
// lihat applyRecurrenceIfDone di actions/pm/tasks.ts) - fungsi ini
// menjawab "kalau pola berulangnya diteruskan, jatuh di tanggal apa saja
// dalam rentang ini", supaya Task berulang kelihatan di minggu-minggu
// depan di Time Box, bukan cuma nongol sekali di 1 baris yang baru
// berpindah setelah dicentang selesai manual tiap siklus.
export function projectRecurringOccurrences(
  dueDate: string,
  type: PmRecurrenceType,
  interval: number,
  endDate: string | null,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const n = Math.max(1, interval);
  const results: string[] = [];

  if (type === "monthly") {
    // Panjang bulan variabel - diiterasi langsung per siklus (aman tanpa
    // fast-forward krn 1 siklus minimal 1 bulan, jumlah iterasi wajar).
    let current = dueDate;
    for (let i = 0; i < 240; i++) {
      current = computeNextDueDate(current, type, n);
      if (endDate && current > endDate) break;
      if (current > rangeEnd) break;
      if (current >= rangeStart) results.push(current);
    }
    return results;
  }

  // weekly/custom: interval harian tetap - fast-forward pakai aritmetika
  // tanggal langsung (BUKAN iterasi 1-1 dari due_date yang mungkin sudah
  // lama lewat, mis. Task overdue berbulan-bulan belum ditandai Done).
  const periodDays = type === "weekly" ? 7 * n : n;
  const dueMs = parseDateUTC(dueDate).getTime();
  const rangeStartMs = parseDateUTC(rangeStart).getTime();
  const rangeEndMs = parseDateUTC(rangeEnd).getTime();
  const diffDays = (rangeStartMs - dueMs) / MS_PER_DAY;
  let cycle = Math.max(1, Math.ceil(diffDays / periodDays) - 1);
  for (let i = 0; i < 60; i++) {
    const occurrenceMs = dueMs + cycle * periodDays * MS_PER_DAY;
    if (occurrenceMs > rangeEndMs) break;
    const occurrence = formatDateUTC(new Date(occurrenceMs));
    if (endDate && occurrence > endDate) break;
    if (occurrenceMs >= rangeStartMs) results.push(occurrence);
    cycle++;
  }
  return results;
}
