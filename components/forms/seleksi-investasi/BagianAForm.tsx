import { FormField } from "@/components/ui/FormField";
import { CurrencyField } from "@/components/ui/CurrencyField";
import { SUMBER_PROPOSAL_OPTIONS } from "@/lib/forms/seleksi-investasi/schema";
import { buatSubmissionBagianA } from "@/actions/submissions";

type BagianAFormProps = {
  nomorRegistrasiDefault: string;
  tanggalDiterimaDefault: string;
  targetSelesaiDefault: string;
  evaluatorPicDefault: string;
  error?: string;
};

export function BagianAForm({
  nomorRegistrasiDefault,
  tanggalDiterimaDefault,
  targetSelesaiDefault,
  evaluatorPicDefault,
  error,
}: BagianAFormProps) {
  return (
    <div className="rounded-3xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-9">
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <form action={buatSubmissionBagianA} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Nomor registrasi proposal"
          name="nomorRegistrasi"
          defaultValue={nomorRegistrasiDefault}
        />
        <FormField
          label="Tanggal proposal diterima"
          name="tanggalDiterima"
          type="date"
          defaultValue={tanggalDiterimaDefault}
        />

        <div className="sm:col-span-2">
          <FormField label="Nama proyek / judul proposal" name="namaProyek" />
        </div>

        <FormField label="Lokasi proyek" name="lokasiProyek" />
        <FormField label="Nama pengusul / calon mitra" name="namaPengusul" />

        <div>
          <label
            htmlFor="sumberProposal"
            className="block text-[13px] font-medium text-zinc-500"
          >
            Sumber proposal
          </label>
          <select
            id="sumberProposal"
            name="sumberProposal"
            required
            defaultValue=""
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="" disabled>
              Pilih sumber proposal
            </option>
            {SUMBER_PROPOSAL_OPTIONS.map((opsi) => (
              <option key={opsi} value={opsi}>
                {opsi}
              </option>
            ))}
          </select>
        </div>

        <FormField label="Skema kerjasama yang diusulkan" name="skemaKerjasama" />
        <CurrencyField label="Estimasi nilai investasi" name="estimasiNilaiInvestasi" />
        <FormField
          label="Evaluator / PIC"
          name="evaluatorPic"
          defaultValue={evaluatorPicDefault}
        />

        <div className="sm:col-span-2">
          <FormField
            label="Target selesai seleksi awal"
            name="targetSelesai"
            type="date"
            defaultValue={targetSelesaiDefault}
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.98] sm:w-auto"
          >
            Lanjut ke Bagian B
          </button>
        </div>
      </form>
    </div>
  );
}
