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

function statusKPI(k: ExsumKeuanganKPI): KpiStatus {
  if (k.target === null) return k.kini >= 0 ? "green" : "red";
  const ok = k.baikJika === "tinggi" ? k.kini >= k.target : k.kini <= k.target;
  if (ok) return "green";
  const near = k.baikJika === "tinggi" ? k.kini >= k.target * 0.85 : k.kini <= k.target * 1.15;
  return near ? "amber" : "red";
}

export function ExsumDocument({
  perusahaan,
  kode,
  periode,
  noDok,
  status,
  data,
}: {
  perusahaan: string;
  kode: string;
  periode: string;
  noDok: string;
  status: string;
  data: ExsumData;
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
            <span className="sheet-no">LEMBAR 1/7</span>
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
            <span className="sheet-no">LEMBAR 2/7</span>
            <h2 className="sheet-title">Kinerja Keuangan ({periode})</h2>
          </div>
          <div className="sheet-body">
            {grupUnik.map((g) => (
              <div key={g}>
                <div className="kpi-group-title">{g}</div>
                <div className="kpi-grid">
                  {data.keuangan
                    .filter((k) => k.grup === g)
                    .map((k, i) => {
                      const st = statusKPI(k);
                      const mom = k.kini - k.lalu;
                      const momBaik = k.baikJika === "tinggi" ? mom >= 0 : mom <= 0;
                      return (
                        <div key={i} className="kpi" style={{ ["--status" as string]: STATUS_COLOR[st] }}>
                          <div className="name">{k.nama}</div>
                          <div className={`val ${k.kini < 0 ? "neg" : ""}`}>{pctFmt(k.kini)}</div>
                          <div className="tgt">Target: {k.target === null ? "—" : pctFmt(k.target)}</div>
                          <div className={`mom ${momBaik ? "pos" : "neg"}`}>
                            {mom >= 0 ? "▲" : "▼"} {pctFmt(Math.abs(mom))} vs {data.keuanganLabelLalu}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
            <p className="note">{data.keuanganNarasi}</p>
          </div>
        </section>

        {/* 3 - PORTOFOLIO */}
        <section>
          <div className="sheet-head">
            <span className="sheet-no">LEMBAR 3/7</span>
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
          </div>
        </section>

        {/* 4 - CAPEX - awal "halaman 2" saat dicetak, lihat exsum.css */}
        <section className="exsum-print-page2">
          <div className="sheet-head">
            <span className="sheet-no">LEMBAR 4/7</span>
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
            <span className="sheet-no">LEMBAR 5/7</span>
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
            <span className="sheet-no">LEMBAR 6/7</span>
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
            <span className="sheet-no">LEMBAR 7/7</span>
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
