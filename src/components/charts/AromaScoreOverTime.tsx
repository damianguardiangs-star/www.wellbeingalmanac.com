'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useKBIStore } from '@/lib/store';

export default function AromaScoreOverTime() {
  const { aromaProfiles, species } = useKBIStore();

  const sorted = [...aromaProfiles].sort(
    (a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime()
  );

  const data = sorted.map(a => {
    const sp = species.find(s => s.id === a.species_id);
    return {
      date: a.evaluation_date.slice(0, 7),
      species: sp?.common_name ?? 'Unknown',
      overall: a.overall_score,
      luxury: a.luxury_score,
      uniqueness: a.uniqueness,
    };
  });

  // Group by date for multi-line
  const dateMap: Record<string, Record<string, number>> = {};
  sorted.forEach(a => {
    const sp = species.find(s => s.id === a.species_id);
    const key = a.evaluation_date.slice(0, 7);
    if (!dateMap[key]) dateMap[key] = { date: key as unknown as number };
    if (sp) dateMap[key][sp.common_name] = a.overall_score;
  });

  const chartData = Object.values(dateMap);
  const speciesNames = [...new Set(data.map(d => d.species))];
  const LINE_COLORS = ['#2a6040', '#d4aa22', '#70b88a', '#b8900e', '#4a9868', '#88886a'];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6d0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#88886a' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#88886a' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#1a3a22', border: '1px solid #2a6040', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#f5f0e4' }}
          itemStyle={{ color: '#d4aa22' }}
        />
        <Legend iconSize={8} formatter={(v) => <span style={{ color: '#88886a', fontSize: 11 }}>{v}</span>} />
        {speciesNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={1.5}
            dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length] }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
