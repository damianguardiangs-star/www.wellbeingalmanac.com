'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDateTime, plantPartLabel, extractionMethodLabel } from '@/lib/utils';

export default function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { plantSamples, species, collectionSites, extractionBatches, currentUser, deleteSample } = useKBIStore();

  const sample = plantSamples.find(s => s.id === id);
  if (!sample) return (
    <div className="p-6 text-center text-ink-400">
      <p>Sample not found.</p>
      <Link href="/samples"><Button variant="secondary" className="mt-4">Back</Button></Link>
    </div>
  );

  const sp = species.find(s => s.id === sample.species_id);
  const site = collectionSites.find(s => s.id === sample.collection_site_id);
  const batches = extractionBatches.filter(b => b.plant_sample_id === id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/samples" className="text-xs text-ink-400 hover:text-ink-600 mb-2 block">← Field Samples</Link>
          <h1 className="text-xl font-mono font-medium text-ink-800">{sample.sample_code}</h1>
          <p className="text-ink-500 text-sm mt-1">{sp?.common_name} <span className="italic">({sp?.scientific_name})</span></p>
        </div>
        <div className="flex gap-2">
          {currentUser?.role === 'admin' && (
            <Button variant="danger" size="sm"
              onClick={() => { if (confirm('Delete sample?')) { deleteSample(id); router.push('/samples'); } }}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Collection Details</p></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                ['Collected', formatDateTime(sample.collected_at)],
                ['Collector', sample.collector_name],
                ['Plant Part', plantPartLabel(sample.plant_part)],
                ['Flowering Stage', sample.flowering_stage.replace(/_/g, ' ')],
                ['Source Type', sample.source_type.replace(/_/g, ' ')],
                ['Quantity', `${sample.quantity_g}g`],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-ink-800 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Location & Environment</p></CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-0.5">Collection Site</p>
                <p className="text-sm text-ink-800">{site?.name}</p>
                <p className="text-xs text-ink-500">{site?.province}, {site?.district}</p>
                {site?.latitude && (
                  <p className="text-xs font-mono text-ink-400">{site.latitude}°N {site.longitude}°E · {site.elevation_m}m asl</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  ['Rainfall', sample.rainfall_mm != null ? `${sample.rainfall_mm}mm` : '—'],
                  ['Temp', sample.temperature_c != null ? `${sample.temperature_c}°C` : '—'],
                  ['Humidity', sample.humidity_pct != null ? `${sample.humidity_pct}%` : '—'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-cream-50 rounded p-2.5 text-center">
                    <p className="text-xs text-ink-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-ink-700 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
              {sample.soil_notes && (
                <div className="pt-2">
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">Soil Notes</p>
                  <p className="text-xs text-ink-600">{sample.soil_notes}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {sample.chain_of_custody && (
          <Card>
            <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Chain of Custody</p></CardHeader>
            <CardBody>
              <p className="text-sm text-ink-700 leading-relaxed">{sample.chain_of_custody}</p>
            </CardBody>
          </Card>
        )}

        {sample.notes && (
          <Card>
            <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Field Notes</p></CardHeader>
            <CardBody>
              <p className="text-sm text-ink-700 leading-relaxed">{sample.notes}</p>
            </CardBody>
          </Card>
        )}

        {batches.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Extraction Batches from this Sample</p>
            </CardHeader>
            <div className="divide-y divide-cream-100">
              {batches.map(b => (
                <div key={b.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-ink-700">{b.batch_code}</p>
                    <p className="text-xs text-ink-400">{extractionMethodLabel(b.method)} · {b.operator_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-forest-700">{b.yield_pct.toFixed(3)}% yield</p>
                    <p className="text-xs text-ink-400">{b.raw_weight_g}g → {b.final_weight_g}g</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
