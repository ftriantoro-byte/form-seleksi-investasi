import { Svg, Polygon, Line, Text as SvgText } from "@react-pdf/renderer";

const SIZE = 160;
const CENTER = SIZE / 2;
const RADIUS = 55;
const MAKS_SKOR = 15;
const RINGS = [5, 10, 15];

function titikSudut(index: number, nilai: number): [number, number] {
  const sudut = (-90 + index * 90) * (Math.PI / 180);
  const r = (nilai / MAKS_SKOR) * RADIUS;
  return [CENTER + r * Math.cos(sudut), CENTER + r * Math.sin(sudut)];
}

function poinToString(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

/** Radar chart 4-sumbu digambar manual dengan primitif react-pdf (Recharts tidak jalan di react-pdf, butuh DOM). */
export function RadarChartPdf({ data }: { data: { dimensi: string; skor: number }[] }) {
  const jumlahSumbu = data.length;

  return (
    <Svg width={SIZE} height={SIZE + 20} viewBox={`0 0 ${SIZE} ${SIZE + 20}`}>
      {RINGS.map((nilai) => (
        <Polygon
          key={nilai}
          points={poinToString(
            Array.from({ length: jumlahSumbu }, (_, i) => titikSudut(i, nilai)),
          )}
          stroke="#e4e4e7"
          strokeWidth={1}
          fill="none"
        />
      ))}

      {data.map((_, i) => {
        const [x, y] = titikSudut(i, MAKS_SKOR);
        return <Line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#e4e4e7" strokeWidth={1} />;
      })}

      <Polygon
        points={poinToString(data.map((d, i) => titikSudut(i, d.skor)))}
        stroke="#18181b"
        strokeWidth={1.5}
        fill="#18181b"
        fillOpacity={0.15}
      />

      {data.map((d, i) => {
        const [x, y] = titikSudut(i, MAKS_SKOR + 3.2);
        const anchor = x < CENTER - 5 ? "end" : x > CENTER + 5 ? "start" : "middle";
        return (
          <SvgText
            key={d.dimensi}
            x={x}
            y={y}
            fill="#52525b"
            textAnchor={anchor}
            style={{ fontSize: 8 }}
          >
            {d.dimensi}
          </SvgText>
        );
      })}
    </Svg>
  );
}
