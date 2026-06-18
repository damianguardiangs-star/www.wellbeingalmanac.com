'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export default function NewAromaPage() {
  const { addAromaProfile, species, extractionBatches, currentUser } = useKBIStore();
  const router = useRouter();
  const [form, setForm] = useState({
    extraction_batch_id: extractionBatches[0]?.id ?? '',
    species_id: species[0]?.id ?? '',
    evaluator_name: currentUser?.name ?? '',
    evaluation_date: new Date().toISOString().slice(0, 10),
    top_notes: '',
    heart_notes: '',
    base_notes: '',
    intensity: 5,
    longevity: 5,
    uniqueness: 5,
    luxury_score: 5,
    perfumer_notes: '',
  });

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'lab_analyst') {
    return <div className="p-6 text-center text-ink-500">Permission denied.</div>;
  }

  const overall = Number(((form.intensity + form.longevity + form.uniqueness + form.luxury_score) / 4).toFixed(2));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addAromaProfile({
      ...form,
      top_notes: form.top_notes.split(',').map(s => s.trim()).filter(Boolean),
      heart_notes: form.heart_notes.split(',').map(s => s.trim()).filter(Boolean),
      base_notes: form.base_notes.split(',').map(s => s.trim()).filter(Boolean),
      overall_score: overall,
    });
    router.push('/aroma');
  }

  const ScoreField = (label: string, key: 'intensity' | 'longevity' | 'uniqueness' | 'luxury_score') => (
    <div>
      <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">
        {label}: <span className="text-forest-700 font-bold">{form[key]}</span>/10
      </label>
      <input
        type="range" min={1} max={10} step={1}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))}
        className="w-full accent-forest-600"
      />
      <div className="flex justify-between text-[10px] text-ink-300 mt-0.5">
        <span>1</span><span>5</span><span>10</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-light text-ink-800">New Aroma Profile</h2>
        <p className="text-sm text-ink-400 mt-1">Record olfactory evaluation of an extraction batch.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Evaluation Context</p></CardHeader>
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Evaluator</label>
                <input type="text" value={form.evaluator_name} onChange={e => setForm(p => ({ ...p, evaluator_name: e.target.value }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Evaluation Date</label>
                <input type="date" value={form.evaluation_date} onChange={e => setForm(p => ({ ...p, evaluation_date: e.target.value }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Olfactory Pyramid</p></CardHeader>
          <CardBody className="space-y-4">
            {[
              { label: 'Top Notes (comma-separated)', key: 'top_notes', placeholder: 'Honey, Sweet floral, Gardenia-like' },
              { label: 'Heart Notes (comma-separated)', key: 'heart_notes', placeholder: 'Tuberose, Jasmine, Creamy' },
              { label: 'Base Notes (comma-separated)', key: 'base_notes', placeholder: 'Musky, Woody, Vanilla' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">{f.label}</label>
                <input type="text" value={form[f.key as keyof typeof form] as string}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400" />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Scoring</p>
            <div className="text-sm">
              Overall: <span className="font-bold text-forest-700">{overall}/10</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            {ScoreField('Intensity', 'intensity')}
            {ScoreField('Longevity', 'longevity')}
            {ScoreField('Uniqueness', 'uniqueness')}
            {ScoreField('Luxury Score', 'luxury_score')}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Perfumer Notes</p></CardHeader>
          <CardBody>
            <textarea
              value={form.perfumer_notes}
              onChange={e => setForm(p => ({ ...p, perfumer_notes: e.target.value }))}
              rows={5}
              placeholder="Detailed olfactory evaluation, comparison notes, blending potential, positioning observations..."
              className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 leading-relaxed"
            />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Save Aroma Profile</Button>
        </div>
      </form>
    </div>
  );
}
