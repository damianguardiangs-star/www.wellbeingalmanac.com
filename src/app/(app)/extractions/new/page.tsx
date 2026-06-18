'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import type { ExtractionMethod } from '@/lib/types';
import { extractionMethodLabel } from '@/lib/utils';

const METHODS: ExtractionMethod[] = ['steam_distillation', 'co2_extraction', 'ethanol_tincture', 'enfleurage', 'solvent_extraction', 'maceration', 'cold_press'];
const OUTPUT_TYPES = ['essential_oil', 'absolute', 'concrete', 'tincture', 'co2_extract', 'resinoid'];

export default function NewExtractionPage() {
  const { addExtraction, species, plantSamples, currentUser } = useKBIStore();
  const router = useRouter();
  const [form, setForm] = useState({
    batch_code: `KBI-EXT-${new Date().getFullYear()}-`,
    plant_sample_id: plantSamples[0]?.id ?? '',
    species_id: species[0]?.id ?? '',
    method: 'steam_distillation' as ExtractionMethod,
    raw_weight_g: '',
    final_weight_g: '',
    duration_hours: '',
    temperature_c: '',
    pressure_bar: '',
    solvent_used: '',
    operator_name: currentUser?.name ?? '',
    extraction_date: new Date().toISOString().slice(0, 10),
    output_type: 'essential_oil',
    colour: '',
    clarity: '',
    notes: '',
  });

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'lab_analyst') {
    return <div className="p-6 text-center text-ink-500">Permission denied.</div>;
  }

  const rawW = Number(form.raw_weight_g);
  const finalW = Number(form.final_weight_g);
  const computedYield = rawW > 0 && finalW > 0 ? ((finalW / rawW) * 100).toFixed(3) : '—';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addExtraction({
      ...form,
      raw_weight_g: rawW,
      final_weight_g: finalW,
      yield_pct: rawW > 0 ? (finalW / rawW) * 100 : 0,
      duration_hours: Number(form.duration_hours),
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      pressure_bar: form.pressure_bar ? Number(form.pressure_bar) : null,
      solvent_used: form.solvent_used || null,
      operator_id: currentUser!.id,
      output_type: form.output_type as ExtractionBatch['output_type'],
    });
    router.push('/extractions');
  }

  type ExtractionBatch = import('@/lib/types').ExtractionBatch;

  const F = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
      />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-light text-ink-800">New Extraction Batch</h2>
        <p className="text-sm text-ink-400 mt-1">Record a new extraction run with full process parameters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Batch Identity</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {F('Batch Code', 'batch_code', 'text', 'KBI-EXT-2024-006')}
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Source Sample</label>
                <select value={form.plant_sample_id}
                  onChange={e => {
                    const s = plantSamples.find(x => x.id === e.target.value);
                    setForm(p => ({ ...p, plant_sample_id: e.target.value, species_id: s?.species_id ?? p.species_id }));
                  }}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {plantSamples.map(s => <option key={s.id} value={s.id}>{s.sample_code}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Species</label>
                <select value={form.species_id} onChange={e => setForm(p => ({ ...p, species_id: e.target.value }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
                </select>
              </div>
              {F('Extraction Date', 'extraction_date', 'date')}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Process Parameters</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Method</label>
                <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value as ExtractionMethod }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {METHODS.map(m => <option key={m} value={m}>{extractionMethodLabel(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Output Type</label>
                <select value={form.output_type} onChange={e => setForm(p => ({ ...p, output_type: e.target.value }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {OUTPUT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {F('Duration (hours)', 'duration_hours', 'number', '4')}
              {F('Temperature (°C)', 'temperature_c', 'number', '100')}
              {F('Pressure (bar)', 'pressure_bar', 'number', '1.0')}
            </div>
            {F('Solvent Used', 'solvent_used', 'text', 'e.g. Ethanol 96%, Hexane, n-Pentane')}
            {F('Operator', 'operator_name')}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Yield & Output</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {F('Raw Material (g)', 'raw_weight_g', 'number', '1000')}
              {F('Final Output (g)', 'final_weight_g', 'number', '15')}
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Computed Yield</label>
                <div className="w-full bg-cream-100 border border-cream-200 rounded px-3 py-2.5 text-sm font-semibold text-forest-700">
                  {computedYield}{computedYield !== '—' ? '%' : ''}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {F('Colour', 'colour', 'text', 'e.g. Pale golden yellow')}
              {F('Clarity', 'clarity', 'text', 'e.g. Clear')}
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3} placeholder="Process observations, anomalies, quality notes..."
                className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Record Extraction</Button>
        </div>
      </form>
    </div>
  );
}
