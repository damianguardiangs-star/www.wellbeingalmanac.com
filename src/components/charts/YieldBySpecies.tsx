'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useKBIStore } from '@/lib/store';

export default function YieldBySpecies() {
  const { species, extractionBatches } = useKBIStore();

  const data = species.map(sp => {
    const batches = extractionBatches.filter(e => e.species_id === sp.id);
    const avgYield = batches.length
      ? batches.reduce((a, b) => a + b.yield_pct, 0) / batches.length
      : 0;
    return {
      name: sp.common_name,
      yield: Number(avgYield.toFixed(3)),
      batches: batches.length,
    };
  }).filter(d => d.batches > 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6d0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#88886a' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#88886a' }} tickLine={false} axisLine={false} unit="%" />
        <Tooltip
          contentStyle={{ background: '#1a3a22', border: '1px solid #2a6040', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#f5f0e4', fontWeight: 500 }}
          itemStyle={{ color: '#d4aa22' }}
          formatter={(v) => [`${v}%`, 'Avg Yield']}
        />
        <Bar dataKey="yield" fill="#2a6040" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
