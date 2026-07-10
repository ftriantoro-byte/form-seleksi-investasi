import { FormField } from "@/components/ui/FormField";
import { CurrencyField } from "@/components/ui/CurrencyField";
import { STATUS_DOKUMEN_OPTIONS } from "@/lib/forms/quick-screen-proyek/schema";
import { buatSubmissionBagianA } from "@/actions/quick-screen-proyek";

type BagianAFormProps = {
  noDokumenDefault: string;
  tanggalDefault: string;
  tanggalInfoDiterimaDefault: string;
  error?: string;
};

export function BagianAForm({
  noDokumenDefault,
  tanggalDefault,
  tanggalInfoDiterimaDefault,
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
        <FormField label="No. dokumen" name="noDokumen" defaultValue={noDokumenDefault} />
        <FormField label="Tanggal" name="tanggal" type="date" defaultValue={tanggalDefault} />

        <div>
          <label htmlFor="statusDokumen" className="block text-[13px] font-medium text-zinc-500">
            Status dokumen
          </label>
          <select
            id="statusDokumen"
            name="statusDokumen"
            required
            defaultValue=""
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="" disabled>
              Pilih status dokumen
            </option>
            {STATUS_DOKUMEN_OPTIONS.map((opsi) => (
              <option key={opsi} value={opsi}>
                {opsi}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <FormField label="Nama proyek" name="namaProyek" />
        </div>

        <FormField label="Sektor/tipologi proyek" name="sektorTipologiProyek" />
        <FormField label="Pemilik/pemberi informasi" name="pemilikPemberiInformasi" />

        <FormField label="Lokasi proyek" name="lokasiProyek" />
        <FormField
          label="Tanggal info diterima"
          name="tanggalInfoDiterima"
          type="date"
          defaultValue={tanggalInfoDiterimaDefault}
        />

        <CurrencyField label="Estimasi nilai proyek" name="estimasiNilaiProyek" />
        <FormField label="Sumber informasi" name="sumberInformasi" />

        <div className="sm:col-span-2">
          <label
            htmlFor="deskripsiProyek"
            className="block text-[13px] font-medium text-zinc-500"
          >
            Deskripsi proyek
          </label>
          <textarea
            id="deskripsiProyek"
            name="deskripsiProyek"
            required
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
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
