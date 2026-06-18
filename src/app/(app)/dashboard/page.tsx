'use client';

import dynamic from 'next/dynamic';
import { useKBIStore } from '@/lib/store';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { formatDate, scoreBg } from '@/lib/utils';

const YieldBySpecies = dynamic(() => import('@/components/charts/YieldBySpecies'), { ssr: false });
const CommercialScoreChart = dynamic(() => import('@/components/charts/CommercialScoreChart'), { ssr: false });
const SamplesByProvince = dynamic(() => import('@/components/charts/SamplesByProvince'), { ssr: false });
const AromaScoreOverTime = dynamic(() => import('@/components/charts/AromaScoreOverTime'), { ssr: false });

export default function DashboardPage() {
  const {
    species, plantSamples, extractionBatches,
    aromaProfiles, chemistryResults, commercialScores,
  } = useKBIStore();

  const avgOverallScore = commercialScores.length
    ? (commercialScores.reduce((a, b) => a + b.overall_score, 0) / commercialScores.length).toFixed(1)
    : '—';

  const topSpecies = [...commercialScores].sort((a, b) => b.overall_score - a.overall_score)[0];
  const topSpeciesName = topSpecies
    ? species.find(s => s.id === topSpecies.species_id)?.common_name ?? '—'
    : '—';

  const recentSamples = [...plantSamples]
    .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Species Catalogued" value={species.length} sub="Cambodian aromatic plants" accent />
        <StatCard label="Field Samples" value={plantSamples.length} sub="Total collected" />
        <StatCard label="Extraction Batches" value={extractionBatches.length} sub="Completed analyses" />
        <StatCard label="Avg Commercial Score" value={avgOverallScore} sub={`Top: ${topSpeciesName}`} />
      </div>

      {/* Row 2: Yield + Commercial */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-ink-700 tracking-wide">Average Yield by Species</h3>
            <p className="text-xs text-ink-400 mt-0.5">Extraction yield percentage</p>
          </CardHeader>
          <CardBody>
            <YieldBySpecies />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-ink-700 tracking-wide">Commercial Score Ranking</h3>
            <p className="text-xs text-ink-400 mt-0.5">Overall commercial viability score /10</p>
          </CardHeader>
          <CardBody>
            <CommercialScoreChart />
          </CardBody>
        </Card>
      </div>

      {/* Row 3: Province + Aroma */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-ink-700 tracking-wide">Samples by Province</h3>
            <p className="text-xs text-ink-400 mt-0.5">Geographic distribution</p>
          </CardHeader>
          <CardBody>
            <SamplesByProvince />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-ink-700 tracking-wide">Aroma Score Over Time</h3>
            <p className="text-xs text-ink-400 mt-0.5">Overall aroma score per evaluation date</p>
          </CardHeader>
          <CardBody>
            <AromaScoreOverTime />
          </CardBody>
        </Card>
      </div>

      {/* Row 4: Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-ink-700 tracking-wide">Recent Field Samples</h3>
          </CardHeader>
          <div className="divide-y divide-cream-100">
            {recentSamples.map(sample => {
              const sp = species.find(s => s.id === sample.species_id);
              return (
                <div key={sample.id} className="px-6 py-3 flex items-center justify-between hover:bg-cream-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-ink-800 font-mono">{sample.sample_code}</p>
                    <p className="text-xs text-ink-400">{sp?.common_name} · {sample.collector_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-500">{formatDate(sample.collected_at)}</p>
                    <p className="text-xs text-ink-400">{sample.quantity_g}g</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-ink-700 tracking-wide">Commercial Snapshot</h3>
          </CardHeader>
          <div className="divide-y divide-cream-100">
            {[...commercialScores].sort((a, b) => b.overall_score - a.overall_score).map(cs => {
              const sp = species.find(s => s.id === cs.species_id);
              return (
                <div key={cs.id} className="px-6 py-3 flex items-center justify-between hover:bg-cream-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{sp?.common_name}</p>
                    <p className="text-xs text-ink-400 italic">{sp?.scientific_name}</p>
                  </div>
                  <span className={`text-xs font-mono font-semibold px-2 py-1 rounded border ${scoreBg(cs.overall_score)}`}>
                    {cs.overall_score.toFixed(1)} / 10
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        {[
          { label: 'Aroma Profiles', value: aromaProfiles.length },
          { label: 'Chemistry Results', value: chemistryResults.length },
          { label: 'Commercial Evaluations', value: commercialScores.length },
          { label: 'Collection Sites', value: '5' },
        ].map(item => (
          <div key={item.label} className="bg-cream-100 border border-cream-200 rounded-lg px-4 py-3">
            <p className="text-2xl font-light text-ink-800">{item.value}</p>
            <p className="text-xs text-ink-400 mt-0.5 tracking-wide">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
