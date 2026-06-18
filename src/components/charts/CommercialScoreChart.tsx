'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useKBIStore } from '@/lib/store';

export default function CommercialScoreChart() {
  const { species, commercialScores } = useKBIStore();

  const data = species.map(sp => {
    const score = commercialScores.find(c => c.species_id === sp.id);
    return {
      name: sp.common_name,
      score: score ? score.overall_score : 0,
    };
  }).sort((a, b) => b.score - a.score);

  const radarData = [
    'rarity', 'yield_economics', 'scent_quality',
    'supply_scalability', 'export_potential', 'brand_fit',
  ].map(key => {
    const row: Record<string, string | number> = { metric: key.replace(/_/g, ' ') };
    species.forEach(sp => {
      const score = commercialScores.find(c => c.species_id === sp.id);
      row[sp.common_name] = score ? score[key as keyof typeof score] as number : 0;
    });
    return row;
  });

  // Use simple bar chart for clarity
  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-xs text-ink-600 w-24 flex-shrink-0 truncate">{d.name}</span>
          <div className="flex-1 score-bar">
            <div
              className="score-bar-fill"
              style={{ width: `${(d.score / 10) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-ink-700 w-8 text-right">{d.score.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
