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
    <>
      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={buatSubmissionBagianA} className="mt-6 flex flex-col gap-4">
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
        <FormField label="Nama proyek / judul proposal" name="namaProyek" />
        <FormField label="Lokasi proyek" name="lokasiProyek" />
        <FormField label="Nama pengusul / calon mitra" name="namaPengusul" />

        <div>
          <label htmlFor="sumberProposal" className="block text-sm font-medium text-gray-700">
            Sumber proposal
          </label>
          <select
            id="sumberProposal"
            name="sumberProposal"
            required
            defaultValue=""
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
        <FormField
          label="Target selesai seleksi awal"
          name="targetSelesai"
          type="date"
          defaultValue={targetSelesaiDefault}
        />

        <button
          type="submit"
          className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Lanjut ke Bagian B
        </button>
      </form>
    </>
  );
}
