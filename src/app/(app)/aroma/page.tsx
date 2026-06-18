'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useKBIStore } from '@/lib/store';
import { exportToCSV } from '@/lib/csv';
import Button from '@/components/ui/Button';
import { formatDate, scoreBg } from '@/lib/utils';

export default function AromaPage() {
  const { aromaProfiles, species, extractionBatches, deleteAromaProfile, currentUser } = useKBIStore();
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');

  const filtered = aromaProfiles.filter(a => {
    const sp = species.find(s => s.id === a.species_id);
    const matchSearch = !search ||
      sp?.common_name.toLowerCase().includes(search.toLowerCase()) ||
      a.evaluator_name.toLowerCase().includes(search.toLowerCase()) ||
      [...a.top_notes, ...a.heart_notes, ...a.base_notes].some(n => n.toLowerCase().includes(search.toLowerCase()));
    const matchSpecies = !filterSpecies || a.species_id === filterSpecies;
    return matchSearch && matchSpecies;
  });

  function handleExport() {
    exportToCSV(filtered.map(a => {
      const sp = species.find(s => s.id === a.species_id);
      return {
        species: sp?.common_name ?? '',
        evaluator: a.evaluator_name,
        date: a.evaluation_date,
        top_notes: a.top_notes.join('; '),
        heart_notes: a.heart_notes.join('; '),
        base_notes: a.base_notes.join('; '),
        intensity: a.intensity,
        longevity: a.longevity,
        uniqueness: a.uniqueness,
        luxury_score: a.luxury_score,
        overall_score: a.overall_score,
        perfumer_notes: a.perfumer_notes,
      };
    }), 'kbi-aroma-profiles');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search species, notes, note descriptors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white border border-cream-300 rounded px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
        />
        <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}
          className="bg-white border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
        </select>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
          {(currentUser?.role === 'admin' || currentUser?.role === 'lab_analyst') && (
            <Link href="/aroma/new"><Button size="sm">+ Add Profile</Button></Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(a => {
          const sp = species.find(s => s.id === a.species_id);
          const batch = extractionBatches.find(e => e.id === a.extraction_batch_id);
          return (
            <div key={a.id} className="bg-white border border-cream-200 rounded-lg p-6 hover:border-cream-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-ink-800">{sp?.common_name}</h3>
                    <span className="text-ink-400 text-xs italic">{sp?.scientific_name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreBg(a.overall_score)}`}>
                      {a.overall_score.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-ink-500 mb-4">
                    <span>Evaluator: <span className="text-ink-700">{a.evaluator_name}</span></span>
                    <span>Date: <span className="text-ink-700">{formatDate(a.evaluation_date)}</span></span>
                    {batch && <span>Batch: <span className="font-mono text-ink-700">{batch.batch_code}</span></span>}
                  </div>

                  {/* Note structure */}
                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    {[
                      { label: 'Top Notes', notes: a.top_notes, bg: 'bg-cream-50' },
                      { label: 'Heart Notes', notes: a.heart_notes, bg: 'bg-forest-50' },
                      { label: 'Base Notes', notes: a.base_notes, bg: 'bg-ink-100' },
                    ].map(col => (
                      <div key={col.label} className={`${col.bg} rounded p-3 border border-cream-100`}>
                        <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-1.5">{col.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {col.notes.map(n => (
                            <span key={n} className="text-xs bg-white text-ink-600 px-1.5 py-0.5 rounded border border-cream-200">{n}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scores row */}
                  <div className="flex gap-6 text-xs">
                    {[
                      { label: 'Intensity', val: a.intensity },
                      { label: 'Longevity', val: a.longevity },
                      { label: 'Uniqueness', val: a.uniqueness },
                      { label: 'Luxury', val: a.luxury_score },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-ink-400 mb-0.5">{item.label}</p>
                        <p className="font-semibold text-ink-700">{item.val}/10</p>
                      </div>
                    ))}
                  </div>

                  {a.perfumer_notes && (
                    <p className="text-xs text-ink-500 italic mt-3 pt-3 border-t border-cream-100 leading-relaxed">
                      "{a.perfumer_notes.slice(0, 280)}{a.perfumer_notes.length > 280 ? '...' : ''}"
                    </p>
                  )}
                </div>

                {currentUser?.role === 'admin' && (
                  <Button variant="ghost" size="sm" className="text-red-400 flex-shrink-0"
                    onClick={() => { if (confirm('Delete?')) deleteAromaProfile(a.id); }}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-ink-400 text-sm">No aroma profiles found</div>
        )}
      </div>
    </div>
  );
}
