import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  SKEMA_KERJASAMA_OPTIONS,
  SCORING_CRITERIA,
  DIMENSI_LIST,
  type SkemaKode,
  type ScoringKode,
} from "../schema";
import { LABEL_TINGKAT, LABEL_STATUS_APPROVAL, STATUS_LABEL, LABEL_DIMENSI } from "../labels";
import { getHasilQuickScreen, hitungSkorDimensi } from "../utils";
import { RadarChartPdf } from "./RadarChartPdf";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 170, color: "#555555" },
  value: { flex: 1 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #333333",
    paddingVertical: 3,
  },
  tableHeaderCell: { fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #dddddd", paddingVertical: 3 },
  cellKriteria: { flex: 3 },
  cellSmall: { flex: 1, textAlign: "right" },
  badge: { marginTop: 6, fontWeight: 700 },
  signatureBox: {
    border: "1px solid #999999",
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    minHeight: 66,
  },
  signatureLabel: { fontWeight: 700, marginBottom: 4 },
  radarWrap: { alignItems: "center", marginTop: 8 },
});

function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export type SubmissionPdfProps = {
  submission: {
    id: string;
    status: string;
    total_skor: number | null;
    dibuat_pada: string;
    data: {
      bagianA?: {
        noDokumen: string;
        tanggal: string;
        statusDokumen: string;
        namaProyek: string;
        sektorTipologiProyek: string;
        pemilikPemberiInformasi: string;
        lokasiProyek: string;
        tanggalInfoDiterima: string;
        estimasiNilaiProyek: number;
        sumberInformasi: string;
        deskripsiProyek: string;
      };
      bagianB?: Record<SkemaKode, { dipilih: "ya" | "tidak"; catatan?: string }>;
      bagianC?: Record<ScoringKode, { skor: number; catatan?: string }>;
      bagianD?: {
        faktorPendorong: string;
        faktorRisiko: string;
        dataDibutuhkanOft: string;
        urgensiTenggat: string;
        namaAnalis?: string;
      };
    };
  };
  approvalChain: Array<{
    tingkat: "manajer" | "vp";
    status: "menunggu" | "disetujui" | "ditolak";
    catatan: string | null;
    diputuskan_pada: string | null;
    namaApprover: string | null;
  } | null>;
};

const URUTAN_TINGKAT = ["manajer", "vp"] as const;

export function SubmissionPdf({ submission, approvalChain }: SubmissionPdfProps) {
  const { bagianA, bagianB, bagianC, bagianD } = submission.data;
  const hasil = submission.total_skor != null ? getHasilQuickScreen(submission.total_skor) : null;
  const perDimensi = bagianC
    ? hitungSkorDimensi(
        Object.fromEntries(SCORING_CRITERIA.map(({ kode }) => [kode, bagianC[kode]?.skor])),
      )
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Quick Screen Proyek</Text>
        <Text style={styles.subtitle}>
          No. Dokumen: {bagianA?.noDokumen ?? "-"} | Status:{" "}
          {STATUS_LABEL[submission.status] ?? submission.status} | Dicetak:{" "}
          {formatTanggal(new Date().toISOString())}
        </Text>

        {bagianA && (
          <View>
            <Text style={styles.sectionTitle}>Bagian A - Identitas Proyek</Text>
            {(
              [
                ["Tanggal", bagianA.tanggal],
                ["Status dokumen", bagianA.statusDokumen],
                ["Nama proyek", bagianA.namaProyek],
                ["Sektor/tipologi proyek", bagianA.sektorTipologiProyek],
                ["Pemilik/pemberi informasi", bagianA.pemilikPemberiInformasi],
                ["Lokasi proyek", bagianA.lokasiProyek],
                ["Tanggal info diterima", bagianA.tanggalInfoDiterima],
                [
                  "Estimasi nilai proyek",
                  `Rp ${Number(bagianA.estimasiNilaiProyek).toLocaleString("id-ID")}`,
                ],
                ["Sumber informasi", bagianA.sumberInformasi],
                ["Deskripsi proyek", bagianA.deskripsiProyek],
              ] as const
            ).map(([label, value]) => (
              <View style={styles.row} key={label}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        {bagianB && (
          <View>
            <Text style={styles.sectionTitle}>Bagian B - Skema Kerjasama</Text>
            {SKEMA_KERJASAMA_OPTIONS.map(({ kode, label }) => (
              <View style={styles.row} key={kode}>
                <Text style={styles.label}>{bagianB[kode]?.dipilih === "ya" ? "Ya" : "Tidak"}</Text>
                <Text style={styles.value}>
                  {label}
                  {bagianB[kode]?.catatan ? ` — ${bagianB[kode]?.catatan}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {bagianC && perDimensi && (
          <View>
            <Text style={styles.sectionTitle}>Bagian C - Penilaian 4 Dimensi</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cellKriteria, styles.tableHeaderCell]}>Dimensi</Text>
              <Text style={[styles.cellSmall, styles.tableHeaderCell]}>Skor</Text>
            </View>
            {DIMENSI_LIST.map((d) => (
              <View style={styles.tableRow} key={d}>
                <Text style={styles.cellKriteria}>{LABEL_DIMENSI[d]}</Text>
                <Text style={styles.cellSmall}>{perDimensi[d]} / 15</Text>
              </View>
            ))}
            <View style={styles.row}>
              <Text style={[styles.label, styles.tableHeaderCell]}>Total skor</Text>
              <Text style={styles.value}>{submission.total_skor ?? "-"} / 60</Text>
            </View>
            <View style={styles.radarWrap}>
              <RadarChartPdf
                data={DIMENSI_LIST.map((d) => ({ dimensi: LABEL_DIMENSI[d], skor: perDimensi[d] }))}
              />
            </View>
          </View>
        )}

        {hasil && <Text style={styles.badge}>Hasil: {hasil.label}</Text>}

        {bagianD && (
          <View>
            <Text style={styles.sectionTitle}>Bagian D - Catatan Analis</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Faktor pendorong (strength)</Text>
              <Text style={styles.value}>{bagianD.faktorPendorong}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Faktor risiko (red flag)</Text>
              <Text style={styles.value}>{bagianD.faktorRisiko}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Data/dokumen dibutuhkan (OFT)</Text>
              <Text style={styles.value}>{bagianD.dataDibutuhkanOft}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Urgensi &amp; tenggat</Text>
              <Text style={styles.value}>{bagianD.urgensiTenggat}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Area Tanda Tangan</Text>

        {URUTAN_TINGKAT.map((tingkat, i) => {
          const baris = approvalChain[i];
          return (
            <View style={styles.signatureBox} key={tingkat}>
              <Text style={styles.signatureLabel}>{LABEL_TINGKAT[tingkat]}</Text>
              <Text>Nama: {baris?.namaApprover ?? "-"}</Text>
              <Text>Keputusan: {baris ? LABEL_STATUS_APPROVAL[baris.status] : "Menunggu"}</Text>
              <Text>Catatan: {baris?.catatan ?? "-"}</Text>
              <Text>Tanggal: {formatTanggal(baris?.diputuskan_pada)}</Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
