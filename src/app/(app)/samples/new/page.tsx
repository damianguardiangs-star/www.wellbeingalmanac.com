'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import type { PlantPart, FloweringStage, SourceType } from '@/lib/types';

export default function NewSamplePage() {
  const { addSample, species, collectionSites, currentUser } = useKBIStore();
  const router = useRouter();
  const [form, setForm] = useState({
    sample_code: `KBI-${new Date().getFullYear()}-`,
    species_id: species[0]?.id ?? '',
    collection_site_id: collectionSites[0]?.id ?? '',
    collector_name: currentUser?.name ?? '',
    collected_at: new Date().toISOString().slice(0, 16),
    plant_part: 'flower' as PlantPart,
    flowering_stage: 'full_bloom' as FloweringStage,
    source_type: 'cultivated' as SourceType,
    quantity_g: '',
    rainfall_mm: '',
    temperature_c: '',
    humidity_pct: '',
    soil_notes: '',
    chain_of_custody: '',
    notes: '',
  });

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'field_collector') {
    return <div className="p-6 text-center text-ink-500">Permission denied.</div>;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addSample({
      ...form,
      collector_id: currentUser!.id,
      quantity_g: Number(form.quantity_g),
      rainfall_mm: form.rainfall_mm ? Number(form.rainfall_mm) : null,
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      humidity_pct: form.humidity_pct ? Number(form.humidity_pct) : null,
      photo_urls: [],
    });
    router.push('/samples');
  }

  const F = (label: string, key: keyof typeof form, type = 'text', opts?: { placeholder?: string; rows?: number }) => {
    const isTA = !!opts?.rows;
    const p = {
      id: key,
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
      placeholder: opts?.placeholder ?? '',
      className: 'w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors',
    };
    return (
      <div>
        <label htmlFor={key} className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">{label}</label>
        {isTA ? <textarea {...p} rows={opts?.rows} /> : <input type={type} {...p} />}
      </div>
    );
  };

  const Sel = (label: string, key: keyof typeof form, options: { value: string; label: string }[]) => (
    <div>
      <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">{label}</label>
      <select
        value={form[key] as string}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-light text-ink-800">New Field Sample</h2>
        <p className="text-sm text-ink-400 mt-1">Record a new plant collection with full provenance data.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Sample Identity</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {F('Sample Code', 'sample_code', 'text', { placeholder: 'KBI-2024-RMD-001' })}
              {Sel('Species', 'species_id', species.map(s => ({ value: s.id, label: s.common_name })))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {Sel('Collection Site', 'collection_site_id', collectionSites.map(s => ({ value: s.id, label: `${s.name} (${s.province})` })))}
              {F('Collector Name', 'collector_name')}
            </div>
            {F('Collection Date & Time', 'collected_at', 'datetime-local')}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Plant Characteristics</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {Sel('Plant Part', 'plant_part', [
                { value: 'flower', label: 'Flower' }, { value: 'leaf', label: 'Leaf' },
                { value: 'bark', label: 'Bark' }, { value: 'root', label: 'Root' },
                { value: 'resin', label: 'Resin' }, { value: 'seed', label: 'Seed' },
                { value: 'wood', label: 'Wood' }, { value: 'whole_plant', label: 'Whole Plant' },
              ])}
              {Sel('Flowering Stage', 'flowering_stage', [
                { value: 'pre_bud', label: 'Pre-Bud' }, { value: 'bud', label: 'Bud' },
                { value: 'early_bloom', label: 'Early Bloom' }, { value: 'full_bloom', label: 'Full Bloom' },
                { value: 'post_bloom', label: 'Post-Bloom' }, { value: 'fruiting', label: 'Fruiting' },
              ])}
              {Sel('Source Type', 'source_type', [
                { value: 'cultivated', label: 'Cultivated' },
                { value: 'wild', label: 'Wild' },
                { value: 'semi_wild', label: 'Semi-Wild' },
              ])}
            </div>
            {F('Quantity (g)', 'quantity_g', 'number', { placeholder: '850' })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Environmental Conditions</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {F('Rainfall (mm)', 'rainfall_mm', 'number', { placeholder: '12' })}
              {F('Temperature (°C)', 'temperature_c', 'number', { placeholder: '24.5' })}
              {F('Humidity (%)', 'humidity_pct', 'number', { placeholder: '78' })}
            </div>
            {F('Soil Notes', 'soil_notes', 'text', { rows: 2, placeholder: 'Soil type, pH, moisture, recent treatments...' })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Chain of Custody & Notes</p></CardHeader>
          <CardBody className="space-y-4">
            {F('Chain of Custody', 'chain_of_custody', 'text', { rows: 2, placeholder: 'Collected by → sealed in → transported at → received...' })}
            {F('Field Notes', 'notes', 'text', { rows: 3, placeholder: 'Observations, anomalies, environmental context...' })}
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Record Sample</Button>
        </div>
      </form>
    </div>
  );
}
