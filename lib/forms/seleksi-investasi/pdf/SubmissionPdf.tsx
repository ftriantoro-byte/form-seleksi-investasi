import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  GATE_CRITERIA,
  SCORING_CRITERIA,
  type GateKode,
  type ScoringKode,
} from "../schema";
import { LABEL_TINGKAT, LABEL_STATUS_APPROVAL, STATUS_LABEL } from "../labels";
import { getRekomendasi } from "../utils";

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
  tableTotalRow: { flexDirection: "row", paddingVertical: 3 },
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
  warningText: { marginTop: 4, color: "#b45309", fontWeight: 700 },
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
        nomorRegistrasi: string;
        tanggalDiterima: string;
        namaProyek: string;
        lokasiProyek: string;
        namaPengusul: string;
        sumberProposal: string;
        skemaKerjasama: string;
        estimasiNilaiInvestasi: number;
        evaluatorPic: string;
        targetSelesai: string;
      };
      bagianB?: Record<GateKode, { jawaban: "ya" | "tidak"; catatan: string }>;
      bagianC?: Record<ScoringKode, { skor: number; justifikasi: string }>;
      bagianD?: {
        catatanEvaluator: string;
        pernyataanBebasBenturan: "ya" | "tidak";
        namaEvaluator: string;
        difinalisasiPada?: string;
      };
    };
  };
  approvalChain: Array<{
    tingkat: "manajer" | "vp" | "direksi";
    status: "menunggu" | "disetujui" | "ditolak";
    catatan: string | null;
    diteruskan_meski_ditolak: boolean;
    diputuskan_pada: string | null;
    namaApprover: string | null;
  } | null>;
};

const URUTAN_TINGKAT = ["manajer", "vp", "direksi"] as const;

export function SubmissionPdf({ submission, approvalChain }: SubmissionPdfProps) {
  const { bagianA, bagianB, bagianC, bagianD } = submission.data;
  const rekomendasi =
    submission.total_skor != null ? getRekomendasi(submission.total_skor) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Seleksi Awal Proposal Investasi</Text>
        <Text style={styles.subtitle}>
          No. Registrasi: {bagianA?.nomorRegistrasi ?? "-"} | Status:{" "}
          {STATUS_LABEL[submission.status] ?? submission.status} | Dicetak:{" "}
          {formatTanggal(new Date().toISOString())}
        </Text>

        {bagianA && (
          <View>
            <Text style={styles.sectionTitle}>Bagian A - Identitas Proposal</Text>
            {(
              [
                ["Nama proyek / judul proposal", bagianA.namaProyek],
                ["Tanggal proposal diterima", bagianA.tanggalDiterima],
                ["Lokasi proyek", bagianA.lokasiProyek],
                ["Nama pengusul / calon mitra", bagianA.namaPengusul],
                ["Sumber proposal", bagianA.sumberProposal],
                ["Skema kerjasama diusulkan", bagianA.skemaKerjasama],
                [
                  "Estimasi nilai investasi",
                  `Rp ${Number(bagianA.estimasiNilaiInvestasi).toLocaleString("id-ID")}`,
                ],
                ["Evaluator / PIC", bagianA.evaluatorPic],
                ["Target selesai seleksi awal", bagianA.targetSelesai],
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
            <Text style={styles.sectionTitle}>Bagian B - Kriteria Gugur (Gate)</Text>
            {GATE_CRITERIA.map(({ kode, label }) => (
              <View style={styles.row} key={kode}>
                <Text style={styles.label}>
                  {kode}: {bagianB[kode].jawaban === "tidak" ? "Tidak" : "Ya"}
                </Text>
                <Text style={styles.value}>{label}</Text>
              </View>
            ))}
            <Text style={styles.badge}>
              Status gate:{" "}
              {submission.status === "tidak_lulus_gate" ? "TIDAK LULUS" : "LULUS"}
            </Text>
          </View>
        )}

        {bagianC && (
          <View>
            <Text style={styles.sectionTitle}>Bagian C - Skoring Berbobot</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cellKriteria, styles.tableHeaderCell]}>Kriteria</Text>
              <Text style={[styles.cellSmall, styles.tableHeaderCell]}>Bobot</Text>
              <Text style={[styles.cellSmall, styles.tableHeaderCell]}>Skor</Text>
              <Text style={[styles.cellSmall, styles.tableHeaderCell]}>Nilai</Text>
            </View>
            {SCORING_CRITERIA.map(({ kode, label, bobot }) => (
              <View style={styles.tableRow} key={kode}>
                <Text style={styles.cellKriteria}>
                  {kode}: {label}
                </Text>
                <Text style={styles.cellSmall}>{bobot.toFixed(2)}</Text>
                <Text style={styles.cellSmall}>{bagianC[kode].skor}</Text>
                <Text style={styles.cellSmall}>{(bobot * bagianC[kode].skor).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.cellKriteria, styles.tableHeaderCell]}>
                Total skor tertimbang
              </Text>
              <Text style={styles.cellSmall} />
              <Text style={styles.cellSmall} />
              <Text style={[styles.cellSmall, styles.tableHeaderCell]}>
                {submission.total_skor?.toFixed(2) ?? "-"}
              </Text>
            </View>
          </View>
        )}

        {rekomendasi && <Text style={styles.badge}>Rekomendasi: {rekomendasi.label}</Text>}

        {bagianD && (
          <View>
            <Text style={styles.sectionTitle}>Bagian D - Catatan &amp; Pernyataan</Text>
            <Text style={styles.value}>{bagianD.catatanEvaluator}</Text>
            <Text style={{ marginTop: 4 }}>
              Pernyataan bebas benturan kepentingan:{" "}
              {bagianD.pernyataanBebasBenturan === "ya" ? "Ya" : "Tidak"}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Area Tanda Tangan</Text>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>Evaluator</Text>
          <Text>Nama: {bagianD?.namaEvaluator ?? bagianA?.evaluatorPic ?? "-"}</Text>
          <Text>Tanggal submit: {formatTanggal(bagianD?.difinalisasiPada)}</Text>
          <Text style={{ marginTop: 8, color: "#999999" }}>
            (paraf digital - identitas terverifikasi lewat akun login saat submit)
          </Text>
        </View>

        {URUTAN_TINGKAT.map((tingkat, i) => {
          const baris = approvalChain[i];
          return (
            <View style={styles.signatureBox} key={tingkat}>
              <Text style={styles.signatureLabel}>
                {LABEL_TINGKAT[tingkat]}
                {tingkat === "direksi" ? " (Keputusan Final)" : ""}
              </Text>
              <Text>Nama: {baris?.namaApprover ?? "-"}</Text>
              <Text>
                Keputusan: {baris ? LABEL_STATUS_APPROVAL[baris.status] : "Menunggu"}
              </Text>
              <Text>Catatan: {baris?.catatan ?? "-"}</Text>
              <Text>Tanggal: {formatTanggal(baris?.diputuskan_pada)}</Text>
              {baris?.diteruskan_meski_ditolak && (
                <Text style={styles.warningText}>
                  Ditolak di tingkat ini, diteruskan atas permintaan Evaluator
                </Text>
              )}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
