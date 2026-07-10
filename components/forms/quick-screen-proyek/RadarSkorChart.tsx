"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

export type RadarSkorDatum = { dimensi: string; skor: number };

export function RadarSkorChart({ data }: { data: RadarSkorDatum[] }) {
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis dataKey="dimensi" tick={{ fill: "#71717a", fontSize: 12 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 15]}
            tickCount={4}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
          />
          <Radar
            dataKey="skor"
            stroke="#18181b"
            fill="#18181b"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
