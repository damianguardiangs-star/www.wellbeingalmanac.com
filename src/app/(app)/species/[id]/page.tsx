'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ScoreBar from '@/components/ui/ScoreBar';
import { formatDate, extractionMethodLabel, plantPartLabel, scoreBg } from '@/lib/utils';

export default function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { species, plantSamples, extractionBatches, aromaProfiles, chemistryResults, commercialScores, currentUser, deleteSpecies } = useKBIStore();

  const sp = species.find(s => s.id === id);
  if (!sp) return (
    <div className="p-6 text-center text-ink-400">
      <p>Species not found.</p>
      <Link href="/species"><Button variant="secondary" className="mt-4">Back to Species</Button></Link>
    </div>
  );

  const samples = plantSamples.filter(s => s.species_id === id);
  const batches = extractionBatches.filter(e => e.species_id === id);
  const aroma = aromaProfiles.filter(a => a.species_id === id);
  const chemicals = chemistryResults.filter(c => c.species_id === id);
  const commercial = commercialScores.find(c => c.species_id === id);

  function handleDelete() {
    if (confirm(`Delete ${sp?.common_name}? This cannot be undone.`)) {
      deleteSpecies(id);
      router.push('/species');
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/species" className="text-xs text-ink-400 hover:text-ink-600 mb-2 block">
            ← Species Library
          </Link>
          <h1 className="text-2xl font-light text-ink-900">{sp.common_name}</h1>
          <p className="text-ink-400 italic mt-1">{sp.scientific_name}</p>
          <p className="text-brass-500 text-lg mt-0.5">{sp.khmer_name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {currentUser?.role === 'admin' && (
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Taxonomy & Classification</p></CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ['Family', sp.family], ['Genus', sp.genus],
                  ['Conservation', sp.conservation_status],
                  ['Regions', sp.native_regions.join(', ')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-ink-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm text-ink-800">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-cream-100">
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-ink-700 leading-relaxed">{sp.description}</p>
              </div>
              {sp.notes && (
                <div className="mt-4 pt-4 border-t border-cream-100">
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-1.5">Field Notes</p>
                  <p className="text-sm text-ink-600 leading-relaxed">{sp.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Extraction Batches */}
          {batches.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Extraction Batches ({batches.length})</p>
                <Link href="/extractions"><Button variant="ghost" size="sm">View all</Button></Link>
              </CardHeader>
              <div className="divide-y divide-cream-100">
                {batches.map(b => (
                  <div key={b.id} className="px-6 py-3 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-mono text-xs text-ink-700">{b.batch_code}</p>
                      <p className="text-xs text-ink-400">{extractionMethodLabel(b.method)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-ink-700">{b.raw_weight_g}g</p>
                      <p className="text-xs text-ink-400">raw</p>
                    </div>
                    <div className="text-center">
                      <p className="text-ink-700">{b.final_weight_g}g</p>
                      <p className="text-xs text-ink-400">yield</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-forest-700">{b.yield_pct.toFixed(3)}%</p>
                      <p className="text-xs text-ink-400">{formatDate(b.extraction_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Chemistry results */}
          {chemicals.length > 0 && (
            <Card>
              <CardHeader>
                <p className="text-xs font-medium text-ink-500 tracking-widest uppercase">GC-MS Compounds ({chemicals.length})</p>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-100">
                      <th className="text-left px-6 py-2 text-xs font-medium text-ink-400 uppercase tracking-wider">Compound</th>
                      <th className="text-left px-6 py-2 text-xs font-medium text-ink-400 uppercase tracking-wider hidden md:table-cell">CAS</th>
                      <th className="text-right px-6 py-2 text-xs font-medium text-ink-400 uppercase tracking-wider">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-50">
                    {[...chemicals].sort((a, b) => b.percentage - a.percentage).map(c => (
                      <tr key={c.id} className="hover:bg-cream-50">
                        <td className="px-6 py-2.5 text-ink-800">{c.compound_name}</td>
                        <td className="px-6 py-2.5 text-ink-400 font-mono text-xs hidden md:table-cell">{c.cas_number}</td>
                        <td className="px-6 py-2.5 text-right font-semibold text-forest-700">{c.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Commercial score */}
          {commercial && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Commercial Score</p>
                  <span className={`text-sm font-bold px-3 py-1 rounded border ${scoreBg(commercial.overall_score)}`}>
                    {commercial.overall_score.toFixed(1)} / 10
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <ScoreBar label="Rarity" value={commercial.rarity} />
                <ScoreBar label="Yield Economics" value={commercial.yield_economics} />
                <ScoreBar label="Scent Quality" value={commercial.scent_quality} />
                <ScoreBar label="Supply Scalability" value={commercial.supply_scalability} />
                <ScoreBar label="Export Potential" value={commercial.export_potential} />
                <ScoreBar label="Brand Fit" value={commercial.brand_fit} />
                <ScoreBar label="Regulatory Risk" value={commercial.regulatory_risk} />
              </CardBody>
              {commercial.market_notes && (
                <div className="px-6 pb-5">
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-1.5">Market Assessment</p>
                  <p className="text-xs text-ink-600 leading-relaxed">{commercial.market_notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Aroma profile */}
          {aroma[0] && (
            <Card>
              <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Latest Aroma Profile</p></CardHeader>
              <CardBody className="space-y-3">
                {[
                  { label: 'Intensity', value: aroma[0].intensity },
                  { label: 'Longevity', value: aroma[0].longevity },
                  { label: 'Uniqueness', value: aroma[0].uniqueness },
                  { label: 'Luxury Score', value: aroma[0].luxury_score },
                ].map(item => <ScoreBar key={item.label} label={item.label} value={item.value} />)}

                <div className="pt-3 space-y-2">
                  {[
                    ['Top Notes', aroma[0].top_notes],
                    ['Heart Notes', aroma[0].heart_notes],
                    ['Base Notes', aroma[0].base_notes],
                  ].map(([label, notes]) => (
                    <div key={label as string}>
                      <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">{label}</p>
                      <div className="flex flex-wrap gap-1">
                        {(notes as string[]).map(n => (
                          <span key={n} className="text-xs bg-cream-100 text-ink-600 px-2 py-0.5 rounded border border-cream-200">{n}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {aroma[0].perfumer_notes && (
                  <div className="pt-3 border-t border-cream-100">
                    <p className="text-xs text-ink-400 uppercase tracking-wider mb-1.5">Perfumer Notes</p>
                    <p className="text-xs text-ink-600 italic leading-relaxed">{aroma[0].perfumer_notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Quick stats */}
          <Card>
            <CardBody>
              <div className="space-y-2 text-sm">
                {[
                  ['Samples', samples.length],
                  ['Batches', batches.length],
                  ['Aroma Profiles', aroma.length],
                  ['Compounds Identified', chemicals.length],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between items-center py-1 border-b border-cream-50 last:border-0">
                    <span className="text-ink-500 text-xs uppercase tracking-wide">{label}</span>
                    <span className="font-semibold text-ink-800">{val}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
