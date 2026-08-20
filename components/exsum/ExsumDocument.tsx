import type { ExsumData, ExsumKeuanganKPI } from "@/lib/exsum/types";

// Port 1:1 dari fungsi util & logika render di exsum-framework-wege.html
// (file sumber yang diadaptasi jadi modul ini) - cuma dipindah dari template
// string + document.getElementById(...).innerHTML ke JSX Server Component,
// angka/logikanya sengaja TIDAK diubah sama sekali.
const idn = (n: number) => n.toLocaleString("id-ID");
const pctFmt = (n: number, d = 2) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
const clsSign = (n: number) => (n < 0 ? "neg" : "pos");

type KpiStatus = "green" | "amber" | "red";
const STATUS_COLOR: Record<KpiStatus, string> = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
};

function cariNilaiKPI(list: ExsumKeuanganKPI[], nama: string): number | null {
  const found = list.find((k) => k.nama === nama);
  return found ? found.kini : null;
}

// Digeneralisasi dari `statusKPI` lama (yg cuma bisa nilai `k.kini`) supaya
// bisa jg dipakai menilai nilai HISTORIS (bulan-bulan lalu) terhadap target
// yang SAMA - dipakai `KpiBullet` di bawah buat mewarnai bar tiap bulan
// (bukan cuma bulan berjalan) sesuai apakah bulan itu capai target.
function statusForValue(v: number, target: number | null, baikJika: "tinggi" | "rendah"): KpiStatus {
  if (target === null) return v >= 0 ? "green" : "red";
  const ok = baikJika === "tinggi" ? v >= target : v <= target;
  if (ok) return "green";
  const near = baikJika === "tinggi" ? v >= target * 0.85 : v <= target * 1.15;
  return near ? "amber" : "red";
}

function statusKPI(k: ExsumKeuanganKPI): KpiStatus {
  return statusForValue(k.kini, k.target, k.baikJika);
}

// Bar "dibandingkan dengan Target" (permintaan user) - pola bullet chart
// (1 bar nilai + 1 tanda garis Target), konsisten dgn pola yg SUDAH ADA di
// BAB 3/7 (`.funnel-track`/`.funnel-fill` utk RKAP/RA/RI) - bukan mekanisme
// baru, cuma diterapkan ke konteks KPI Keuangan. `min`/`max` dilempar dari
// pemanggil (dihitung 1x per baris KPI, sudah mencakup Target - lihat
// render BAB 2/7) supaya smua bar SEBARIS (histori + bulan ini) pakai skala
// yang SAMA, jadi bisa dibandingkan apa adanya antar bulan.
function KpiBullet({
  value,
  target,
  min,
  max,
  status,
}: {
  value: number;
  target: number | null;
  min: number;
  max: number;
  status: KpiStatus;
}) {
  const rentang = max - min || 1;
  const posisi = (v: number) => Math.min(100, Math.max(0, ((v - min) / rentang) * 100));
  return (
    <span className="kpi-bullet">
      <span className="kpi-bullet-fill" style={{ width: `${posisi(value)}%`, background: STATUS_COLOR[status] }} />
      {target !== null && <span className="kpi-bullet-target" style={{ left: `${posisi(target)}%` }} />}
    </span>
  );
}

// Grafik tren (permintaan user: "tren dibuat grafik tren dari 3 bulan
// terakhir") - polyline SVG murni (pola sama dgn donut chart Segmen di BAB
// 3/7: SVG dihitung manual, tanpa library chart baru), TIDAK ikut skala
// Target (beda dari KpiBullet) krn tujuannya nunjukin BENTUK pergerakan
// antar bulan, bukan posisi thd Target - dinormalisasi ke rentang nilai
// titik2-nya sendiri spy pergerakan kecil sekalipun tetap kelihatan jelas.
function KpiTrendChart({ points, baik }: { points: number[]; baik: boolean }) {
  const w = 60;
  const h = 22;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const rentang = max - min || 1;
  const x = (i: number) => (points.length > 1 ? pad + (i / (points.length - 1)) * (w - pad * 2) : w / 2);
  const y = (v: number) => h - pad - ((v - min) / rentang) * (h - pad * 2);
  const warna = baik ? "var(--green)" : "var(--red)";
  return (
    <svg width={w} height={h} className="kpi-trend-svg" aria-hidden>
      {points.length > 1 && (
        <polyline
          points={points.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          fill="none"
          stroke={warna}
          strokeWidth={1.6}
        />
      )}
      {points.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === points.length - 1 ? 2.4 : 1.5}
          fill={i === points.length - 1 ? warna : "var(--steel-lt)"}
        />
      ))}
    </svg>
  );
}

export function ExsumDocument({
  perusahaan,
  kode,
  periode,
  noDok,
  status,
  data,
  historisKeuangan = [],
}: {
  perusahaan: string;
  kode: string;
  periode: string;
  noDok: string;
  status: string;
  data: ExsumData;
  // Laporan kode Perusahaan yang sama, urut KRONOLOGIS (lama -> baru), TIDAK
  // termasuk laporan yang sedang ditampilkan (`data.keuangan` sendiri) -
  // dipakai buat tabel "Tren N Bulan Terakhir" di BAB 2/7 (lihat
  // app/exsum/[reportId]/page.tsx). Opsional (default kosong) supaya
  // pemanggil lain (mis. halaman cetak/preview lampiran lain, kalau ada di
  // masa depan) tidak wajib nyediakan ini.
  historisKeuangan?: { periode: string; keuangan: ExsumKeuanganKPI[] }[];
}) {
  const K = data.kompetitif;
  const P = data.portofolio;
  const C = data.capex;
  const maxShare = Math.max(1, ...K.pesaing.map((p) => p.share));
  const grupUnik = [...new Set(data.keuangan.map((k) => k.grup))];

  // stroke-dashoffset kumulatif per segmen donut - dihitung sekali di sini
  // (bukan mutasi variabel di dalam .map() render) supaya lolos eslint
  // react-hooks/immutability & tidak bergantung urutan evaluasi render.
  const donutOffsets: number[] = [];
  P.segmen.reduce((offset, sg) => {
    donutOffsets.push(offset);
    return offset - sg.pct;
  }, 25);

  return (
    <div className="exsum-doc">
      <div className="page">
        <header className="titleblock">
          <div className="tb-main">
            <div className="tb-eyebrow">
              {perusahaan} · {kode}
            </div>
            <div className="tb-title">{data.judul}</div>
            <div className="tb-sub">{data.subjudul}</div>
          </div>
          <div className="tb-fields">
            <div className="tb-field">
              <div className="k">Periode</div>
              <div className="v">{periode}</div>
            </div>
            <div className="tb-field">
              <div className="k">No. Dokumen</div>
              <div className="v" style={{ fontSize: 15 }}>
                {noDok}
              </div>
            </div>
            <div className="tb-field">
              <div className="k">Status</div>
              <div className="v">{status}</div>
            </div>
          </div>
        </header>

        {/* 1 - POSISI KOMPETITIF */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">BAB 1/7</span>
            <h2 className="sheet-title">Posisi Kompetitif di Industri Konstruksi</h2>
          </div>
          <div className="sheet-body">
            <div className="comp-grid">
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 10,
                  }}
                >
                  Market Share {K.sumber ? `(${K.sumber})` : ""}
                </div>
                {K.pesaing.map((p, i) => (
                  <div key={i} className={`bar-row ${p.highlight ? "hl" : ""}`}>
                    <span className="lbl">
                      {p.rank}. {p.nama}
                    </span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(p.share / maxShare) * 100}%` }} />
                    </div>
                    <span className="bar-val">{pctFmt(p.share, 1)}</span>
                  </div>
                ))}
                <table className="margin-table">
                  <tbody>
                    <tr>
                      <th>Margin</th>
                      <th>GPM</th>
                      <th>OPM</th>
                      <th>NPM</th>
                    </tr>
                    {K.pesaing.map((p, i) => (
                      <tr key={i} className={p.highlight ? "hl" : ""}>
                        <td>{p.highlight ? <b>{p.nama}</b> : p.nama}</td>
                        <td className={clsSign(p.gpm)}>{pctFmt(p.gpm)}</td>
                        <td className={clsSign(p.opm)}>{pctFmt(p.opm)}</td>
                        <td className={clsSign(p.npm)}>{pctFmt(p.npm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="rank-cards">
                  <div className="rank-card">
                    <div className="big warn">#{K.peringkat}</div>
                    <div className="cap">Peringkat Nasional</div>
                    <div className="delta">▼ dari #{K.peringkatSebelum}</div>
                  </div>
                  <div className="rank-card">
                    <div className="big warn">{pctFmt(K.share, 1)}</div>
                    <div className="cap">Market Share</div>
                    <div className="delta">▼ dari {pctFmt(K.shareSebelum, 2)}</div>
                  </div>
                </div>
                <p className="note" style={{ borderTop: "none", marginTop: 14 }}>
                  {K.narasi}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2 - KEUANGAN */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">BAB 2/7</span>
            <h2 className="sheet-title">Kinerja Keuangan ({periode})</h2>
          </div>
          <div className="sheet-body">
            {grupUnik.map((g) => (
              <div key={g}>
                <div className="kpi-group-title">{g}</div>
                <table className="kpi-table">
                  <thead>
                    <tr>
                      <th>{g}</th>
                      {historisKeuangan.map((h) => (
                        <th key={h.periode}>{h.periode}</th>
                      ))}
                      <th className="current">{periode}</th>
                      <th>Target</th>
                      <th>Tren</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keuangan
                      .filter((k) => k.grup === g)
                      .map((k) => {
                        const nilaiLalu = historisKeuangan.map((h) => ({
                          periode: h.periode,
                          nilai: cariNilaiKPI(h.keuangan, k.nama),
                        }));
                        const referensi = nilaiLalu.find((n) => n.nilai !== null);
                        const acuanNilai = referensi ? (referensi.nilai as number) : k.lalu;
                        const acuanLabel = referensi ? referensi.periode : data.keuanganLabelLalu;
                        const tren = k.kini - acuanNilai;
                        const trenBaik = k.baikJika === "tinggi" ? tren >= 0 : tren <= 0;

                        // Skala bar (KpiBullet) MENCAKUP Target - permintaan
                        // user "chart dibuat dibandingkan dengan target" -
                        // supaya tanda Target selalu jatuh di dalam track,
                        // bukan di luar/terpotong. 0 SENGAJA ikut dimasukkan
                        // jg (bukan cuma min/max nilai) - tanpa ini, bulan
                        // dgn nilai TERKECIL di baris itu selalu jadi bar
                        // ~0% lebar (persis di titik minimumnya sendiri),
                        // biar kelihatan spt data kosong/rusak padahal cuma
                        // kebetulan dia paling kecil - dgn 0 ikut jadi acuan,
                        // lebar bar merepresentasikan MAGNITUDE sungguhan
                        // relatif ke titik nol, bukan cuma posisi relatif
                        // antar bulan yang ditampilkan.
                        const semuaNilai = [
                          ...nilaiLalu.map((n) => n.nilai).filter((v): v is number => v !== null),
                          k.kini,
                          ...(k.target !== null ? [k.target] : []),
                          0,
                        ];
                        const minBar = Math.min(...semuaNilai);
                        const maxBar = Math.max(...semuaNilai);

                        // Titik grafik tren TIDAK ikut skala Target (fokus ke
                        // BENTUK pergerakan, bukan posisi thd Target) -
                        // fallback ke k.lalu kalau histori nyata < 2 titik
                        // (mis. laporan bulan pertama, belum ada riwayat).
                        const titikTren = [
                          ...nilaiLalu.map((n) => n.nilai).filter((v): v is number => v !== null),
                          k.kini,
                        ];
                        if (titikTren.length < 2) titikTren.unshift(k.lalu);

                        return (
                          <tr key={k.nama}>
                            <td>
                              <span className="kpi-name-cell">{k.nama}</span>
                            </td>
                            {nilaiLalu.map((n, i) => (
                              <td key={i}>
                                {n.nilai === null ? (
                                  "—"
                                ) : (
                                  <span className="kpi-cell">
                                    <KpiBullet
                                      value={n.nilai}
                                      target={k.target}
                                      min={minBar}
                                      max={maxBar}
                                      status={statusForValue(n.nilai, k.target, k.baikJika)}
                                    />
                                    {pctFmt(n.nilai)}
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="current">
                              <span className="kpi-cell">
                                <KpiBullet
                                  value={k.kini}
                                  target={k.target}
                                  min={minBar}
                                  max={maxBar}
                                  status={statusKPI(k)}
                                />
                                <b>{pctFmt(k.kini)}</b>
                              </span>
                            </td>
                            <td className="kpi-target">{k.target === null ? "—" : pctFmt(k.target)}</td>
                            <td className="kpi-tren">
                              <div className="kpi-tren-chart">
                                <KpiTrendChart points={titikTren} baik={trenBaik} />
                                <div className={trenBaik ? "pos" : "neg"}>
                                  {tren >= 0 ? "▲" : "▼"} {pctFmt(Math.abs(tren))}
                                </div>
                              </div>
                              <div className="kpi-tren-label">vs {acuanLabel}</div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ))}

            <p className="note">{data.keuanganNarasi}</p>
          </div>
        </section>

        {/* 3 - PORTOFOLIO */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">BAB 3/7</span>
            <h2 className="sheet-title">Kinerja Portofolio ({periode})</h2>
          </div>
          <div className="sheet-body">
            <div className="porto-grid">
              <div>
                {P.rows.map((r, i) => {
                  const good = r.pct >= 100;
                  const riWidth = Math.min(r.pct, 100);
                  const riColor = good ? "var(--green)" : r.pct >= 60 ? "var(--steel)" : "var(--red)";
                  const raPct = r.rkap > 0 ? Math.round((r.ra / r.rkap) * 10000) / 100 : 0;
                  const raWidth = Math.min(raPct, 100);
                  // RA cuma penanda referensi (bukan KPI ber-status), jadi
                  // selalu satu warna muda - beda dari RI yg pakai warna
                  // status (hijau/biru/merah). Bar bernilai LEBIH KECIL selalu
                  // ditaruh di depan (belakangan di DOM = di atas) - kalau
                  // ditaruh di belakang, bar pendek itu akan tertutup total
                  // oleh bar yg lebih panjang di sebelahnya (catatan user).
                  const riBar = { width: riWidth, color: riColor, label: pctFmt(r.pct, 1) };
                  const raBar = { width: raWidth, color: "var(--steel-lt)", label: null as string | null };
                  const [backBar, frontBar] = r.ri <= r.ra ? [raBar, riBar] : [riBar, raBar];
                  return (
                    <div key={i} className="funnel-row">
                      <div className="funnel-top">
                        <span className="nm">{r.nama}</span>
                        <span className="pv">
                          RKAP {idn(r.rkap)} · RA {idn(r.ra)} → RI {idn(r.ri)}{" "}
                          <span style={{ color: good ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                            ({pctFmt(r.pct)})
                          </span>
                        </span>
                      </div>
                      <div className="funnel-track">
                        <div
                          className={`funnel-fill${backBar.label ? " funnel-fill-labeled" : ""}`}
                          style={{ width: `${backBar.width}%`, background: backBar.color }}
                        >
                          {backBar.label}
                        </div>
                        <div
                          className={`funnel-fill funnel-fill-front${frontBar.label ? " funnel-fill-labeled" : ""}`}
                          style={{ width: `${frontBar.width}%`, background: frontBar.color }}
                        >
                          {frontBar.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 12,
                  }}
                >
                  Kontrak Baru per Segmen
                </div>
                <div className="donut-wrap">
                  <svg width="150" height="150" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="none" stroke="#EDF2F6" strokeWidth="7" />
                    {P.segmen.map((sg, i) => (
                      <circle
                        key={i}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="none"
                        stroke={sg.warna}
                        strokeWidth="7"
                        strokeDasharray={`${sg.pct} ${100 - sg.pct}`}
                        strokeDashoffset={donutOffsets[i]}
                      />
                    ))}
                    {P.segmen[0] && (
                      <>
                        <text
                          x="21"
                          y="20"
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="700"
                          fill="var(--navy)"
                          fontFamily="var(--font-disp)"
                        >
                          {pctFmt(P.segmen[0].pct, 1)}
                        </text>
                        <text
                          x="21"
                          y="26"
                          textAnchor="middle"
                          fontSize="3.2"
                          fill="var(--muted)"
                          fontFamily="var(--font-mono)"
                        >
                          {P.segmen[0].nama.toUpperCase()}
                        </text>
                      </>
                    )}
                  </svg>
                  <div className="legend">
                    {P.segmen.map((sg, i) => (
                      <div key={i}>
                        <span className="sw" style={{ background: sg.warna }} />
                        {sg.nama}
                        <br />
                        <small style={{ color: "var(--muted)" }}>Rp {idn(sg.nilai)} jt</small>
                        <span className="pct">{pctFmt(sg.pct, 1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="note">{P.narasi}</p>
              </div>
            </div>
            {/* Rasio CO/OB dst - di luar porto-grid supaya melebar selebar
                halaman (permintaan user), bukan kejepit di kolom kiri. */}
            <div className="ratio-chips">
              {P.rasio.map((r, i) => (
                <div key={i} className="ratio-chip">
                  <div className="r">{r.nilai}</div>
                  <div className="t">Rasio {r.nama}</div>
                  <div className="s">{r.ket}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 - CAPEX - awal "halaman 2" saat dicetak, lihat exsum.css */}
        <section className="exsum-print-page2">
          <div className="sheet-head">
            <span className="sheet-no">BAB 4/7</span>
            <h2 className="sheet-title">Sasaran Investasi (CAPEX)</h2>
          </div>
          <div className="sheet-body">
            <div className="capex-grid">
              <div className="capex-hero">
                <div className="big">{pctFmt(C.realisasiPct, 0)}</div>
                <div className="cap">{C.heroCaption}</div>
                <div className="sub">{C.heroSub}</div>
              </div>
              <div className="capex-list">
                <div className="capex-item head">
                  <span>Kategori</span>
                  <span className="amt">RKAP (Rp jt)</span>
                  <span className="re">Realisasi</span>
                </div>
                {C.items.map((i, idx) => (
                  <div key={idx} className="capex-item">
                    <span>{i.nama}</span>
                    <span className="amt">{i.rkap ? idn(i.rkap) : "—"}</span>
                    <span className={`re ${i.ri ? "" : "neg"}`}>{i.ri ? idn(i.ri) : "—"}</span>
                  </div>
                ))}
                <div className="capex-item total">
                  <span>TOTAL CAPEX</span>
                  <span className="amt">{idn(C.items.reduce((a, b) => a + b.rkap, 0))}</span>
                  <span className="re neg">—</span>
                </div>
              </div>
            </div>
            <p className="note">{C.narasi}</p>
          </div>
        </section>

        {/* 5 - ISU */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">BAB 5/7</span>
            <h2 className="sheet-title">Isu Strategis Utama &amp; Mitigasi</h2>
          </div>
          <div className="sheet-body">
            <div className="issue-grid">
              <div className="issue-col eks">
                <h4>Eksternal</h4>
                <ul>
                  {data.isu.eksternal.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
              <div className="issue-col intl">
                <h4>Internal</h4>
                <ul>
                  {data.isu.internal.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
              <div className="issue-col mit">
                <h4>Mitigasi Berjalan</h4>
                <ul>
                  {data.isu.mitigasi.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6 - MITRA */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">BAB 6/7</span>
            <h2 className="sheet-title">Progres Mitra Strategis &amp; Pipeline Potensial</h2>
          </div>
          <div className="sheet-body">
            <div className="mitra-grid">
              {data.mitra.map((m, i) => (
                <div key={i} className={`mitra-card ${m.full ? "full" : ""}`}>
                  <h5>{m.judul}</h5>
                  <p>{m.isi}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7 - REKOMENDASI */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">BAB 7/7</span>
            <h2 className="sheet-title">Rekomendasi untuk Direksi &amp; Dewan Komisaris</h2>
          </div>
          <div className="sheet-body">
            <div className="reko">
              {data.rekomendasi.map((r, i) => (
                <div key={i} className="reko-item">
                  <p>{r}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer>
          <span>
            {noDok} · {periode}
          </span>
          <span>{perusahaan}</span>
        </footer>
      </div>
    </div>
  );
}
