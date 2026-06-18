'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import type { DetectionMethod } from '@/lib/types';

export default function NewChemistryPage() {
  const { addChemistryResult, species, extractionBatches, currentUser } = useKBIStore();
  const router = useRouter();
  const [form, setForm] = useState({
    extraction_batch_id: extractionBatches[0]?.id ?? '',
    species_id: species[0]?.id ?? '',
    compound_name: '',
    cas_number: '',
    percentage: '',
    detection_method: 'gc_ms' as DetectionMethod,
    lab_name: 'KBI Internal Laboratory',
    analysis_date: new Date().toISOString().slice(0, 10),
    certificate_url: '',
    notes: '',
  });

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'lab_analyst') {
    return <div className="p-6 text-center text-ink-500">Permission denied.</div>;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addChemistryResult({
      ...form,
      percentage: Number(form.percentage),
      certificate_url: form.certificate_url || null,
    });
    router.push('/chemistry');
  }

  const F = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">{label}</label>
      <input type={type} value={form[key] as string}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
      />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-light text-ink-800">Add Chemistry Result</h2>
        <p className="text-sm text-ink-400 mt-1">Record a GC-MS compound identification result.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Source</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Extraction Batch</label>
                <select value={form.extraction_batch_id}
                  onChange={e => {
                    const b = extractionBatches.find(x => x.id === e.target.value);
                    setForm(p => ({ ...p, extraction_batch_id: e.target.value, species_id: b?.species_id ?? p.species_id }));
                  }}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {extractionBatches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Species</label>
                <select value={form.species_id} onChange={e => setForm(p => ({ ...p, species_id: e.target.value }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Compound Data</p></CardHeader>
          <CardBody className="space-y-4">
            {F('Compound Name', 'compound_name', 'text', 'e.g. Linalool')}
            <div className="grid sm:grid-cols-2 gap-4">
              {F('CAS Number', 'cas_number', 'text', 'e.g. 78-70-6')}
              {F('Percentage (%)', 'percentage', 'number', 'e.g. 28.4')}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Detection Method</label>
                <select value={form.detection_method} onChange={e => setForm(p => ({ ...p, detection_method: e.target.value as DetectionMethod }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                  {['gc_ms', 'gc_fid', 'hplc', 'nmr', 'other'].map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              {F('Analysis Date', 'analysis_date', 'date')}
            </div>
            {F('Lab Name', 'lab_name', 'text', 'KBI Internal Laboratory')}
            {F('Certificate URL', 'certificate_url', 'url', 'https://...')}
            <div>
              <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Significance, comparison to literature, anomalies..."
                className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400"
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Save Result</Button>
        </div>
      </form>
    </div>
  );
}
