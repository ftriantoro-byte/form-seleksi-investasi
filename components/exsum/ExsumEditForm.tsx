"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateReport } from "@/actions/exsum";
import { EXSUM_STATUS_VALUES } from "@/lib/exsum/schema";
import { BULAN_LIST, formatPeriode, formatNoDok, parsePeriode } from "@/lib/exsum/periode";
import {
  normalizeExsumData,
  syncKompetitifFromHighlight,
  recomputeSegmenPct,
  recomputeCapexPct,
} from "@/lib/exsum/normalize";
import type {
  ExsumData,
  ExsumPesaing,
  ExsumKeuanganKPI,
  ExsumPortofolioRow,
  ExsumRasio,
  ExsumSegmen,
  ExsumCapexItem,
  ExsumMitra,
} from "@/lib/exsum/types";

type Meta = { perusahaan: string; kode: string; periode: string; noDok: string; status: "Draft" | "Final" };

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";
const labelCls = "block text-[11px] font-medium text-zinc-500";
const sectionCls =
  "mt-8 rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9";
const rowCls = "grid grid-cols-1 gap-2 rounded-xl bg-zinc-50 p-3 sm:grid-cols-[1fr_auto]";
const removeBtnCls = "shrink-0 self-start text-[12px] text-zinc-400 hover:text-red-600";
const addBtnCls =
  "mt-3 w-fit rounded-full bg-zinc-100 px-4 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-200";

// Field bersarang (7 section, tiap section punya array baris berbeda-beda
// bentuk) dikelola lewat 1 objek state `data` di sini, bukan <form
// action={serverAction}> biasa - jauh lebih praktis utk add/remove baris
// dinamis. Simpan memanggil Server Action `updateReport` langsung (bukan
// lewat FormData) sesuai pola convertActionItemToTask dkk di modul PM.
export function ExsumEditForm({
  reportId,
  meta: initialMeta,
  initialData,
}: {
  reportId: string;
  meta: Meta;
  initialData: ExsumData;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [data, setData] = useState<ExsumData>(() => normalizeExsumData(initialData));
  const initialParsed = parsePeriode(initialMeta.periode);
  const now = new Date();
  const [periodeBulan, setPeriodeBulan] = useState(initialParsed?.bulan ?? now.getMonth());
  const [periodeTahun, setPeriodeTahun] = useState(initialParsed?.tahun ?? now.getFullYear());

  // Periode & No. Dokumen diturunkan dari pilihan Bulan+Tahun (catatan user:
  // laporan ini rutin dibuat 1x/bulan) - No. Dokumen ikut ter-update
  // otomatis TAPI tetap bisa disunting manual (field-nya sendiri masih
  // editable, cuma nilai awalnya mengikuti Bulan+Tahun yang dipilih).
  function handlePeriodeChange(bulan: number, tahun: number) {
    setPeriodeBulan(bulan);
    setPeriodeTahun(tahun);
    setMeta((prev) => ({ ...prev, periode: formatPeriode(bulan, tahun), noDok: formatNoDok(bulan, tahun) }));
  }

  function save() {
    setSaving(true);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateReport(reportId, { ...meta, data });
        setMessage("Tersimpan.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Gagal menyimpan.");
      } finally {
        setSaving(false);
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* ── Identitas & Meta ─────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">Identitas Laporan</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Perusahaan</label>
            <input
              className={inputCls}
              value={meta.perusahaan}
              onChange={(e) => setMeta({ ...meta, perusahaan: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Kode</label>
            <input
              className={inputCls}
              value={meta.kode}
              onChange={(e) => setMeta({ ...meta, kode: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Periode</label>
            <div className="mt-1.5 flex gap-2">
              <select
                className={`${inputCls} mt-0`}
                value={periodeBulan}
                onChange={(e) => handlePeriodeChange(Number(e.target.value), periodeTahun)}
              >
                {BULAN_LIST.map((b, i) => (
                  <option key={b} value={i}>
                    {b}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className={`${inputCls} mt-0 w-24 shrink-0`}
                value={periodeTahun}
                onChange={(e) => handlePeriodeChange(periodeBulan, Number(e.target.value) || periodeTahun)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>No. Dokumen</label>
            <input
              className={inputCls}
              value={meta.noDok}
              onChange={(e) => setMeta({ ...meta, noDok: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              className={inputCls}
              value={meta.status}
              onChange={(e) => setMeta({ ...meta, status: e.target.value as "Draft" | "Final" })}
            >
              {EXSUM_STATUS_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Judul</label>
            <input
              className={inputCls}
              value={data.judul}
              onChange={(e) => setData({ ...data, judul: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Subjudul</label>
            <textarea
              rows={2}
              className={inputCls}
              value={data.subjudul}
              onChange={(e) => setData({ ...data, subjudul: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── 1. Kompetitif ────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">1. Posisi Kompetitif</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <ReadonlyField
            label="Peringkat (otomatis dari &quot;Ini kami&quot;)"
            value={data.kompetitif.peringkat}
          />
          <NumField
            label="Peringkat Sebelum (otomatis dari laporan lalu)"
            value={data.kompetitif.peringkatSebelum}
            onChange={(v) =>
              setData({ ...data, kompetitif: { ...data.kompetitif, peringkatSebelum: v } })
            }
          />
          <ReadonlyField
            label="Market Share % (otomatis dari &quot;Ini kami&quot;)"
            value={data.kompetitif.share}
          />
          <NumField
            label="Share Sebelum % (otomatis dari laporan lalu)"
            value={data.kompetitif.shareSebelum}
            onChange={(v) => setData({ ...data, kompetitif: { ...data.kompetitif, shareSebelum: v } })}
          />
          <div>
            <label className={labelCls}>Sumber</label>
            <input
              className={inputCls}
              value={data.kompetitif.sumber}
              onChange={(e) =>
                setData({ ...data, kompetitif: { ...data.kompetitif, sumber: e.target.value } })
              }
            />
          </div>
        </div>

        <p className="mt-5 text-[12px] font-medium text-zinc-500">Pesaing (market share &amp; margin)</p>
        <div className="mt-2 space-y-2">
          {data.kompetitif.pesaing.map((p, i) => (
            <div key={i} className={rowCls}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
                <TextField
                  label="Nama"
                  value={p.nama}
                  onChange={(v) => updatePesaing(i, { nama: v })}
                  className="sm:col-span-2"
                />
                <NumField label="Rank" value={p.rank} onChange={(v) => updatePesaing(i, { rank: v })} />
                <NumField label="Share %" value={p.share} onChange={(v) => updatePesaing(i, { share: v })} />
                <NumField label="GPM %" value={p.gpm} onChange={(v) => updatePesaing(i, { gpm: v })} />
                <NumField label="OPM %" value={p.opm} onChange={(v) => updatePesaing(i, { opm: v })} />
                <NumField label="NPM %" value={p.npm} onChange={(v) => updatePesaing(i, { npm: v })} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <input
                    type="checkbox"
                    checked={p.highlight ?? false}
                    onChange={(e) => updatePesaing(i, { highlight: e.target.checked })}
                  />
                  Ini kami
                </label>
                <button type="button" className={removeBtnCls} onClick={() => removePesaing(i)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={addBtnCls}
          onClick={() =>
            setData({
              ...data,
              kompetitif: {
                ...data.kompetitif,
                pesaing: [
                  ...data.kompetitif.pesaing,
                  { nama: "", share: 0, gpm: 0, opm: 0, npm: 0, rank: data.kompetitif.pesaing.length + 1 },
                ],
              },
            })
          }
        >
          + Tambah Pesaing
        </button>

        <div className="mt-4">
          <label className={labelCls}>Narasi</label>
          <textarea
            rows={3}
            className={inputCls}
            value={data.kompetitif.narasi}
            onChange={(e) =>
              setData({ ...data, kompetitif: { ...data.kompetitif, narasi: e.target.value } })
            }
          />
        </div>
      </div>

      {/* ── 2. Keuangan ──────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">2. Kinerja Keuangan</h3>
        <div className="mt-4">
          <label className={labelCls}>Label bulan pembanding (mis. &quot;RI Juni-26&quot;)</label>
          <input
            className={inputCls}
            value={data.keuanganLabelLalu}
            onChange={(e) => setData({ ...data, keuanganLabelLalu: e.target.value })}
          />
        </div>

        <p className="mt-5 text-[12px] font-medium text-zinc-500">Rasio / KPI</p>
        <div className="mt-2 space-y-2">
          {data.keuangan.map((k, i) => (
            <div key={i} className={rowCls}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                <TextField
                  label="Grup"
                  value={k.grup}
                  onChange={(v) => updateKeuangan(i, { grup: v })}
                  className="sm:col-span-2"
                />
                <TextField
                  label="Nama KPI"
                  value={k.nama}
                  onChange={(v) => updateKeuangan(i, { nama: v })}
                  className="sm:col-span-2"
                />
                <div>
                  <label className={labelCls}>Target (%, kosongkan jika tidak ada)</label>
                  <input
                    type="number"
                    step="any"
                    className={inputCls}
                    value={k.target ?? ""}
                    onChange={(e) =>
                      updateKeuangan(i, { target: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Baik Jika</label>
                  <select
                    className={inputCls}
                    value={k.baikJika}
                    onChange={(e) => updateKeuangan(i, { baikJika: e.target.value as "tinggi" | "rendah" })}
                  >
                    <option value="tinggi">Tinggi</option>
                    <option value="rendah">Rendah</option>
                  </select>
                </div>
                <NumField label="Bulan Lalu (%)" value={k.lalu} onChange={(v) => updateKeuangan(i, { lalu: v })} />
                <NumField label="Kini (%)" value={k.kini} onChange={(v) => updateKeuangan(i, { kini: v })} />
              </div>
              <button type="button" className={removeBtnCls} onClick={() => removeKeuangan(i)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={addBtnCls}
          onClick={() =>
            setData({
              ...data,
              keuangan: [
                ...data.keuangan,
                { grup: "", nama: "", target: null, lalu: 0, kini: 0, baikJika: "tinggi" },
              ],
            })
          }
        >
          + Tambah KPI
        </button>

        <div className="mt-4">
          <label className={labelCls}>Narasi</label>
          <textarea
            rows={3}
            className={inputCls}
            value={data.keuanganNarasi}
            onChange={(e) => setData({ ...data, keuanganNarasi: e.target.value })}
          />
        </div>
      </div>

      {/* ── 3. Portofolio ────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">3. Kinerja Portofolio</h3>

        <p className="mt-4 text-[12px] font-medium text-zinc-500">Baris RKAP vs RI</p>
        <div className="mt-2 space-y-2">
          {data.portofolio.rows.map((r, i) => (
            <div key={i} className={rowCls}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <TextField
                  label="Nama"
                  value={r.nama}
                  onChange={(v) => updatePortoRow(i, { nama: v })}
                  className="sm:col-span-2"
                />
                <NumField label="RKAP (Rp jt)" value={r.rkap} onChange={(v) => updatePortoRow(i, { rkap: v })} />
                <NumField
                  label="RA Bulan Berjalan (Rp jt)"
                  value={r.ra}
                  onChange={(v) => updatePortoRow(i, { ra: v })}
                />
                <NumField label="RI Bulan Berjalan (Rp jt)" value={r.ri} onChange={(v) => updatePortoRow(i, { ri: v })} />
              </div>
              <button type="button" className={removeBtnCls} onClick={() => removePortoRow(i)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">
          Persentase (RI/RKAP) dihitung otomatis saat disimpan - tidak perlu diisi manual.
        </p>
        <button
          type="button"
          className={addBtnCls}
          onClick={() =>
            setData({
              ...data,
              portofolio: {
                ...data.portofolio,
                rows: [...data.portofolio.rows, { nama: "", rkap: 0, ra: 0, ri: 0, pct: 0 }],
              },
            })
          }
        >
          + Tambah Baris
        </button>

        <p className="mt-5 text-[12px] font-medium text-zinc-500">Rasio</p>
        <div className="mt-2 space-y-2">
          {data.portofolio.rasio.map((r, i) => (
            <div key={i} className={rowCls}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <TextField label="Nilai (mis. 85,68%)" value={r.nilai} onChange={(v) => updateRasio(i, { nilai: v })} />
                <TextField label="Nama Rasio" value={r.nama} onChange={(v) => updateRasio(i, { nama: v })} />
                <TextField
                  label="Keterangan"
                  value={r.ket}
                  onChange={(v) => updateRasio(i, { ket: v })}
                  className="sm:col-span-2"
                />
              </div>
              <button type="button" className={removeBtnCls} onClick={() => removeRasio(i)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={addBtnCls}
          onClick={() =>
            setData({
              ...data,
              portofolio: { ...data.portofolio, rasio: [...data.portofolio.rasio, { nilai: "", nama: "", ket: "" }] },
            })
          }
        >
          + Tambah Rasio
        </button>

        <p className="mt-5 text-[12px] font-medium text-zinc-500">Segmen Kontrak Baru (donut chart)</p>
        <div className="mt-2 space-y-2">
          {data.portofolio.segmen.map((s, i) => (
            <div key={i} className={rowCls}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <TextField label="Nama" value={s.nama} onChange={(v) => updateSegmen(i, { nama: v })} />
                <NumField label="Nilai (Rp jt)" value={s.nilai} onChange={(v) => updateSegmen(i, { nilai: v })} />
                <ReadonlyField label="Persen (otomatis)" value={s.pct} />
                <div>
                  <label className={labelCls}>Warna</label>
                  <input
                    type="color"
                    className="h-[34px] w-full rounded-lg border border-zinc-200"
                    value={s.warna}
                    onChange={(e) => updateSegmen(i, { warna: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className={removeBtnCls} onClick={() => removeSegmen(i)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={addBtnCls}
          onClick={() => addSegmen()}
        >
          + Tambah Segmen
        </button>

        <div className="mt-4">
          <label className={labelCls}>Narasi</label>
          <textarea
            rows={3}
            className={inputCls}
            value={data.portofolio.narasi}
            onChange={(e) => setData({ ...data, portofolio: { ...data.portofolio, narasi: e.target.value } })}
          />
        </div>
      </div>

      {/* ── 4. Capex ─────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">4. Sasaran Investasi (CAPEX)</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ReadonlyField label="Realisasi % (otomatis, total Realisasi/RKAP)" value={data.capex.realisasiPct} />
          <TextField
            label="Keterangan Utama"
            value={data.capex.heroCaption}
            onChange={(v) => setData({ ...data, capex: { ...data.capex, heroCaption: v } })}
          />
          <TextField
            label="Sub-keterangan"
            value={data.capex.heroSub}
            onChange={(v) => setData({ ...data, capex: { ...data.capex, heroSub: v } })}
          />
        </div>

        <p className="mt-5 text-[12px] font-medium text-zinc-500">Pos Anggaran</p>
        <div className="mt-2 space-y-2">
          {data.capex.items.map((it, i) => (
            <div key={i} className={rowCls}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <TextField
                  label="Nama Pos"
                  value={it.nama}
                  onChange={(v) => updateCapexItem(i, { nama: v })}
                />
                <NumField label="RKAP (Rp jt)" value={it.rkap} onChange={(v) => updateCapexItem(i, { rkap: v })} />
                <NumField label="Realisasi (Rp jt)" value={it.ri} onChange={(v) => updateCapexItem(i, { ri: v })} />
              </div>
              <button type="button" className={removeBtnCls} onClick={() => removeCapexItem(i)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={addBtnCls} onClick={() => addCapexItem()}>
          + Tambah Pos
        </button>

        <div className="mt-4">
          <label className={labelCls}>Narasi</label>
          <textarea
            rows={3}
            className={inputCls}
            value={data.capex.narasi}
            onChange={(e) => setData({ ...data, capex: { ...data.capex, narasi: e.target.value } })}
          />
        </div>
      </div>

      {/* ── 5. Isu ───────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">5. Isu Strategis &amp; Mitigasi</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StringListEditor
            label="Eksternal"
            items={data.isu.eksternal}
            onChange={(items) => setData({ ...data, isu: { ...data.isu, eksternal: items } })}
          />
          <StringListEditor
            label="Internal"
            items={data.isu.internal}
            onChange={(items) => setData({ ...data, isu: { ...data.isu, internal: items } })}
          />
          <StringListEditor
            label="Mitigasi Berjalan"
            items={data.isu.mitigasi}
            onChange={(items) => setData({ ...data, isu: { ...data.isu, mitigasi: items } })}
          />
        </div>
      </div>

      {/* ── 6. Mitra ─────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">6. Mitra Strategis &amp; Pipeline</h3>
        <div className="mt-4 space-y-2">
          {data.mitra.map((m, i) => (
            <div key={i} className={rowCls}>
              <div className="space-y-2">
                <TextField label="Judul Kartu" value={m.judul} onChange={(v) => updateMitra(i, { judul: v })} />
                <div>
                  <label className={labelCls}>Isi</label>
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={m.isi}
                    onChange={(e) => updateMitra(i, { isi: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <input
                    type="checkbox"
                    checked={m.full ?? false}
                    onChange={(e) => updateMitra(i, { full: e.target.checked })}
                  />
                  Tampil selebar 2 kolom (untuk catatan penutup)
                </label>
              </div>
              <button type="button" className={removeBtnCls} onClick={() => removeMitra(i)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={addBtnCls}
          onClick={() => setData({ ...data, mitra: [...data.mitra, { judul: "", isi: "" }] })}
        >
          + Tambah Kartu Mitra
        </button>
      </div>

      {/* ── 7. Rekomendasi ───────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-[14px] font-semibold text-zinc-900">7. Rekomendasi</h3>
        <div className="mt-4">
          <StringListEditor
            label="Poin rekomendasi (bernomor otomatis di tampilan)"
            items={data.rekomendasi}
            onChange={(items) => setData({ ...data, rekomendasi: items })}
            multiline
          />
        </div>
      </div>

      <div className="sticky bottom-4 mt-8 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Laporan"}
        </button>
        {message && <span className="text-[13px] text-zinc-500">{message}</span>}
      </div>
    </div>
  );

  // Peringkat & Market Share di atas SELALU ikut baris pesaing yang ditandai
  // "Ini kami" (catatan user: "otomatis jika dipilih ini kami") - bukan cuma
  // pas checkbox-nya dicentang, tapi tiap kali baris itu (atau baris lain
  // yang mungkin jadi ganti ditandai) berubah, supaya tetap sinkron.
  function updatePesaing(i: number, patch: Partial<ExsumPesaing>) {
    setData((prev) => {
      const pesaing = prev.kompetitif.pesaing.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
      return {
        ...prev,
        kompetitif: syncKompetitifFromHighlight({ ...prev.kompetitif, pesaing }),
      };
    });
  }
  function removePesaing(i: number) {
    setData((prev) => ({
      ...prev,
      kompetitif: { ...prev.kompetitif, pesaing: prev.kompetitif.pesaing.filter((_, idx) => idx !== i) },
    }));
  }

  function updateKeuangan(i: number, patch: Partial<ExsumKeuanganKPI>) {
    setData((prev) => ({
      ...prev,
      keuangan: prev.keuangan.map((k, idx) => (idx === i ? { ...k, ...patch } : k)),
    }));
  }
  function removeKeuangan(i: number) {
    setData((prev) => ({ ...prev, keuangan: prev.keuangan.filter((_, idx) => idx !== i) }));
  }

  function updatePortoRow(i: number, patch: Partial<ExsumPortofolioRow>) {
    setData((prev) => {
      const rows = prev.portofolio.rows.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        next.pct = next.rkap > 0 ? Math.round((next.ri / next.rkap) * 10000) / 100 : 0;
        return next;
      });
      return { ...prev, portofolio: { ...prev.portofolio, rows } };
    });
  }
  function removePortoRow(i: number) {
    setData((prev) => ({
      ...prev,
      portofolio: { ...prev.portofolio, rows: prev.portofolio.rows.filter((_, idx) => idx !== i) },
    }));
  }

  function updateRasio(i: number, patch: Partial<ExsumRasio>) {
    setData((prev) => ({
      ...prev,
      portofolio: {
        ...prev.portofolio,
        rasio: prev.portofolio.rasio.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
      },
    }));
  }
  function removeRasio(i: number) {
    setData((prev) => ({
      ...prev,
      portofolio: { ...prev.portofolio, rasio: prev.portofolio.rasio.filter((_, idx) => idx !== i) },
    }));
  }

  function updateSegmen(i: number, patch: Partial<ExsumSegmen>) {
    setData((prev) => {
      const segmen = recomputeSegmenPct(
        prev.portofolio.segmen.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
      );
      return { ...prev, portofolio: { ...prev.portofolio, segmen } };
    });
  }
  function addSegmen() {
    setData((prev) => {
      const segmen = recomputeSegmenPct([
        ...prev.portofolio.segmen,
        { nama: "", nilai: 0, pct: 0, warna: "#3E7CB1" },
      ]);
      return { ...prev, portofolio: { ...prev.portofolio, segmen } };
    });
  }
  function removeSegmen(i: number) {
    setData((prev) => {
      const segmen = recomputeSegmenPct(prev.portofolio.segmen.filter((_, idx) => idx !== i));
      return { ...prev, portofolio: { ...prev.portofolio, segmen } };
    });
  }

  function updateCapexItem(i: number, patch: Partial<ExsumCapexItem>) {
    setData((prev) => {
      const items = prev.capex.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
      return { ...prev, capex: { ...prev.capex, items, realisasiPct: recomputeCapexPct(items) } };
    });
  }
  function addCapexItem() {
    setData((prev) => {
      const items = [...prev.capex.items, { nama: "", rkap: 0, ri: 0 }];
      return { ...prev, capex: { ...prev.capex, items, realisasiPct: recomputeCapexPct(items) } };
    });
  }
  function removeCapexItem(i: number) {
    setData((prev) => {
      const items = prev.capex.items.filter((_, idx) => idx !== i);
      return { ...prev, capex: { ...prev.capex, items, realisasiPct: recomputeCapexPct(items) } };
    });
  }

  function updateMitra(i: number, patch: Partial<ExsumMitra>) {
    setData((prev) => ({
      ...prev,
      mitra: prev.mitra.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));
  }
  function removeMitra(i: number) {
    setData((prev) => ({ ...prev, mitra: prev.mitra.filter((_, idx) => idx !== i) }));
  }
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        step="any"
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </div>
  );
}

// Dipakai utk field yang dihitung otomatis (Peringkat/Share dari "Ini kami",
// Persen Segmen, Realisasi % CAPEX) - ditampilkan supaya user tetap lihat
// hasilnya, TAPI tidak bisa diketik langsung (mencegah nilai jadi tidak
// sinkron dgn sumber datanya).
function ReadonlyField({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        readOnly
        className={`${inputCls} cursor-not-allowed bg-zinc-100 text-zinc-500`}
        value={value}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// Dipakai utk 4 daftar teks polos (Isu eksternal/internal/mitigasi &
// Rekomendasi) - satu baris teks per item, tombol +/Hapus per baris.
function StringListEditor({
  label,
  items,
  onChange,
  multiline,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            {multiline ? (
              <textarea
                rows={2}
                className={inputCls}
                value={item}
                onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
              />
            ) : (
              <input
                className={inputCls}
                value={item}
                onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
              />
            )}
            <button
              type="button"
              className="shrink-0 text-[12px] text-zinc-400 hover:text-red-600"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={addBtnCls} onClick={() => onChange([...items, ""])}>
        + Tambah
      </button>
    </div>
  );
}
