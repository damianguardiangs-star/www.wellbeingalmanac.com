'use client';

import { useState } from 'react';
import { useKBIStore } from '@/lib/store';
import { exportToCSV } from '@/lib/csv';
import Button from '@/components/ui/Button';
import ScoreBar from '@/components/ui/ScoreBar';
import { scoreBg, formatDate } from '@/lib/utils';

export default function CommercialPage() {
  const { commercialScores, species, addCommercialScore, currentUser } = useKBIStore();
  const [showForm, setShowForm] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState('');

  const filtered = filterSpecies
    ? commercialScores.filter(c => c.species_id === filterSpecies)
    : commercialScores;

  const sorted = [...filtered].sort((a, b) => b.overall_score - a.overall_score);

  const [form, setForm] = useState({
    species_id: species[0]?.id ?? '',
    evaluator_name: currentUser?.name ?? '',
    evaluation_date: new Date().toISOString().slice(0, 10),
    rarity: 5, yield_economics: 5, scent_quality: 5,
    supply_scalability: 5, regulatory_risk: 5,
    export_potential: 5, brand_fit: 5,
    market_notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const scores = [form.rarity, form.yield_economics, form.scent_quality, form.supply_scalability, form.export_potential, form.brand_fit];
    const overall = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
    addCommercialScore({ ...form, overall_score: overall });
    setShowForm(false);
  }

  function handleExport() {
    exportToCSV(sorted.map(c => {
      const sp = species.find(s => s.id === c.species_id);
      return {
        species: sp?.common_name ?? '',
        evaluator: c.evaluator_name,
        date: c.evaluation_date,
        rarity: c.rarity,
        yield_economics: c.yield_economics,
        scent_quality: c.scent_quality,
        supply_scalability: c.supply_scalability,
        regulatory_risk: c.regulatory_risk,
        export_potential: c.export_potential,
        brand_fit: c.brand_fit,
        overall_score: c.overall_score,
        market_notes: c.market_notes,
      };
    }), 'kbi-commercial-scores');
  }

  const ScoreSlider = (label: string, key: keyof typeof form) => (
    <div>
      <label className="flex justify-between text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">
        <span>{label}</span>
        <span className="text-forest-700 font-bold">{form[key as keyof typeof form]}</span>
      </label>
      <input type="range" min={1} max={10} step={1}
        value={form[key as keyof typeof form] as number}
        onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))}
        className="w-full accent-forest-600"
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}
          className="bg-white border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
          {(currentUser?.role === 'admin' || currentUser?.role === 'commercial_reviewer') && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Evaluation'}
            </Button>
          )}
        </div>
      </div>

      {/* New evaluation form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-cream-200 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-medium text-ink-700 mb-4 tracking-wide uppercase">New Commercial Evaluation</h3>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Species</label>
              <select value={form.species_id} onChange={e => setForm(p => ({ ...p, species_id: e.target.value }))}
                className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
                {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Evaluator</label>
              <input type="text" value={form.evaluator_name} onChange={e => setForm(p => ({ ...p, evaluator_name: e.target.value }))}
                className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Date</label>
              <input type="date" value={form.evaluation_date} onChange={e => setForm(p => ({ ...p, evaluation_date: e.target.value }))}
                className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 mb-4">
            <div className="space-y-4">
              {ScoreSlider('Rarity', 'rarity')}
              {ScoreSlider('Yield Economics', 'yield_economics')}
              {ScoreSlider('Scent Quality', 'scent_quality')}
              {ScoreSlider('Supply Scalability', 'supply_scalability')}
            </div>
            <div className="space-y-4">
              {ScoreSlider('Regulatory Risk', 'regulatory_risk')}
              {ScoreSlider('Export Potential', 'export_potential')}
              {ScoreSlider('Brand Fit', 'brand_fit')}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Market Notes</label>
            <textarea value={form.market_notes} onChange={e => setForm(p => ({ ...p, market_notes: e.target.value }))}
              rows={3} placeholder="Strategic assessment, positioning, risks, opportunities..."
              className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Evaluation</Button>
          </div>
        </form>
      )}

      {/* Score cards */}
      <div className="space-y-4">
        {sorted.map((cs, i) => {
          const sp = species.find(s => s.id === cs.species_id);
          return (
            <div key={cs.id} className="bg-white border border-cream-200 rounded-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Rank + Name */}
                <div className="lg:w-56 flex-shrink-0">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-3xl font-light text-ink-200">#{i + 1}</span>
                    <h3 className="text-lg font-medium text-ink-800">{sp?.common_name}</h3>
                  </div>
                  <p className="text-xs text-ink-400 italic mb-3">{sp?.scientific_name}</p>
                  <div className={`inline-flex items-center px-4 py-2 rounded text-xl font-bold border ${scoreBg(cs.overall_score)}`}>
                    {cs.overall_score.toFixed(1)} <span className="text-sm font-normal ml-1">/ 10</span>
                  </div>
                  <div className="mt-3 text-xs text-ink-400">
                    <p>{cs.evaluator_name}</p>
                    <p>{formatDate(cs.evaluation_date)}</p>
                  </div>
                </div>

                {/* Score bars */}
                <div className="flex-1 space-y-2.5">
                  <ScoreBar label="Rarity" value={cs.rarity} />
                  <ScoreBar label="Yield Economics" value={cs.yield_economics} />
                  <ScoreBar label="Scent Quality" value={cs.scent_quality} />
                  <ScoreBar label="Supply Scalability" value={cs.supply_scalability} />
                  <ScoreBar label="Export Potential" value={cs.export_potential} />
                  <ScoreBar label="Brand Fit (Khmere)" value={cs.brand_fit} />
                  <ScoreBar label="Regulatory Risk" value={cs.regulatory_risk} />
                </div>

                {/* Notes */}
                {cs.market_notes && (
                  <div className="lg:w-72 flex-shrink-0">
                    <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">Market Assessment</p>
                    <p className="text-xs text-ink-600 leading-relaxed">{cs.market_notes}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-ink-400 text-sm">No commercial evaluations yet</div>
      )}
    </div>
  );
}
