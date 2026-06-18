'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useKBIStore } from '@/lib/store';

const COLORS = ['#2a6040', '#367a52', '#4a9868', '#70b88a', '#b8900e', '#d4aa22'];

export default function SamplesByProvince() {
  const { plantSamples, collectionSites } = useKBIStore();

  const provinceMap: Record<string, number> = {};
  plantSamples.forEach(s => {
    const site = collectionSites.find(c => c.id === s.collection_site_id);
    const province = site?.province ?? 'Unknown';
    provinceMap[province] = (provinceMap[province] ?? 0) + 1;
  });

  const data = Object.entries(provinceMap).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1a3a22', border: '1px solid #2a6040', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#f5f0e4' }}
          itemStyle={{ color: '#d4aa22' }}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          formatter={(v) => <span style={{ color: '#88886a', fontSize: 11 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
