'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useKBIStore } from '@/lib/store';
import { exportToCSV } from '@/lib/csv';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate, extractionMethodLabel } from '@/lib/utils';

export default function ExtractionsPage() {
  const { extractionBatches, species, plantSamples, deleteExtraction, currentUser } = useKBIStore();
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');

  const filtered = extractionBatches.filter(e => {
    const sp = species.find(s => s.id === e.species_id);
    const matchSearch = !search ||
      e.batch_code.toLowerCase().includes(search.toLowerCase()) ||
      sp?.common_name.toLowerCase().includes(search.toLowerCase()) ||
      e.operator_name.toLowerCase().includes(search.toLowerCase());
    const matchMethod = !filterMethod || e.method === filterMethod;
    const matchSpecies = !filterSpecies || e.species_id === filterSpecies;
    return matchSearch && matchMethod && matchSpecies;
  });

  function handleExport() {
    exportToCSV(filtered.map(e => {
      const sp = species.find(s => s.id === e.species_id);
      return {
        batch_code: e.batch_code,
        species: sp?.common_name ?? '',
        method: e.method,
        raw_weight_g: e.raw_weight_g,
        final_weight_g: e.final_weight_g,
        yield_pct: e.yield_pct,
        duration_hours: e.duration_hours,
        temperature_c: e.temperature_c ?? '',
        operator: e.operator_name,
        output_type: e.output_type,
        date: e.extraction_date,
        notes: e.notes,
      };
    }), 'kbi-extractions');
  }

  const avgYield = filtered.length
    ? (filtered.reduce((a, b) => a + b.yield_pct, 0) / filtered.length).toFixed(3)
    : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Batches', value: filtered.length },
          { label: 'Avg Yield', value: `${avgYield}%` },
          { label: 'Total Raw Material', value: `${filtered.reduce((a, b) => a + b.raw_weight_g, 0).toLocaleString()}g` },
        ].map(item => (
          <div key={item.label} className="bg-white border border-cream-200 rounded-lg px-4 py-3">
            <p className="text-xs text-ink-400 uppercase tracking-wider">{item.label}</p>
            <p className="text-xl font-light text-ink-800 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search batch code, species, operator..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white border border-cream-300 rounded px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
        />
        <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}
          className="bg-white border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
        </select>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
          className="bg-white border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400">
          <option value="">All Methods</option>
          {['steam_distillation', 'co2_extraction', 'ethanol_tincture', 'enfleurage', 'solvent_extraction', 'maceration', 'cold_press'].map(m => (
            <option key={m} value={m}>{extractionMethodLabel(m)}</option>
          ))}
        </select>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
          {(currentUser?.role === 'admin' || currentUser?.role === 'lab_analyst') && (
            <Link href="/extractions/new"><Button size="sm">+ New Batch</Button></Link>
          )}
        </div>
      </div>

      <div className="bg-white border border-cream-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Batch Code</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Species</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden md:table-cell">Method</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden lg:table-cell">Raw (g)</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden lg:table-cell">Final (g)</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Yield %</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Output</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {filtered.map(e => {
                const sp = species.find(s => s.id === e.species_id);
                return (
                  <tr key={e.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-700">{e.batch_code}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-ink-800">{sp?.common_name}</p>
                      <p className="text-xs text-ink-400 italic">{sp?.scientific_name}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Badge variant="muted">{extractionMethodLabel(e.method)}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-ink-600 hidden lg:table-cell">{e.raw_weight_g.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-ink-600 hidden lg:table-cell">{e.final_weight_g}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-mono font-semibold text-sm ${e.yield_pct >= 1 ? 'text-forest-700' : e.yield_pct >= 0.1 ? 'text-brass-600' : 'text-ink-500'}`}>
                        {e.yield_pct.toFixed(3)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-400 hidden xl:table-cell">{formatDate(e.extraction_date)}</td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <Badge variant="forest">{e.output_type.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {currentUser?.role === 'admin' && (
                          <Button variant="ghost" size="sm" className="text-red-500"
                            onClick={() => { if (confirm('Delete batch?')) deleteExtraction(e.id); }}>
                            Del
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-ink-400 text-sm">No batches found</div>
          )}
        </div>
        <div className="px-5 py-3 bg-cream-50 border-t border-cream-200 text-xs text-ink-400">
          {filtered.length} batches
        </div>
      </div>
    </div>
  );
}
