'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useKBIStore } from '@/lib/store';
import { exportToCSV } from '@/lib/csv';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export default function ChemistryPage() {
  const { chemistryResults, species, extractionBatches, deleteChemistryResult, currentUser } = useKBIStore();
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');

  const filtered = chemistryResults.filter(c => {
    const sp = species.find(s => s.id === c.species_id);
    const matchSearch = !search ||
      c.compound_name.toLowerCase().includes(search.toLowerCase()) ||
      c.cas_number.includes(search) ||
      sp?.common_name.toLowerCase().includes(search.toLowerCase()) ||
      c.lab_name.toLowerCase().includes(search.toLowerCase());
    const matchSpecies = !filterSpecies || c.species_id === filterSpecies;
    return matchSearch && matchSpecies;
  });

  // Top compounds analysis
  const compoundMap: Record<string, { total: number; count: number }> = {};
  filtered.forEach(c => {
    if (!compoundMap[c.compound_name]) compoundMap[c.compound_name] = { total: 0, count: 0 };
    compoundMap[c.compound_name].total += c.percentage;
    compoundMap[c.compound_name].count++;
  });
  const topCompounds = Object.entries(compoundMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  function handleExport() {
    exportToCSV(filtered.map(c => {
      const sp = species.find(s => s.id === c.species_id);
      const batch = extractionBatches.find(e => e.id === c.extraction_batch_id);
      return {
        species: sp?.common_name ?? '',
        batch_code: batch?.batch_code ?? '',
        compound_name: c.compound_name,
        cas_number: c.cas_number,
        percentage: c.percentage,
        detection_method: c.detection_method,
        lab_name: c.lab_name,
        analysis_date: c.analysis_date,
        notes: c.notes,
      };
    }), 'kbi-chemistry');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top compounds insight */}
      {topCompounds.length > 0 && (
        <div className="bg-forest-900 border border-forest-700 rounded-lg p-5 mb-6">
          <p className="text-brass-400 text-xs tracking-widest uppercase mb-3">Top Detected Compounds</p>
          <div className="flex flex-wrap gap-3">
            {topCompounds.map(([name, data]) => (
              <div key={name} className="bg-forest-800 border border-forest-600 rounded px-3 py-2">
                <p className="text-cream-200 text-sm font-medium">{name}</p>
                <p className="text-forest-300 text-xs mt-0.5">avg {(data.total / data.count).toFixed(2)}% · {data.count} batch{data.count > 1 ? 'es' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search compound, CAS number, species, lab..."
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
            <Link href="/chemistry/new"><Button size="sm">+ Add Result</Button></Link>
          )}
        </div>
      </div>

      <div className="bg-white border border-cream-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Compound</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden md:table-cell">CAS Number</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Species</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">%</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden lg:table-cell">Method</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Lab</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {filtered.map(c => {
                const sp = species.find(s => s.id === c.species_id);
                return (
                  <tr key={c.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-ink-800 font-medium">{c.compound_name}</p>
                      {c.notes && <p className="text-xs text-ink-400 mt-0.5 truncate max-w-xs">{c.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell font-mono text-xs text-ink-500">{c.cas_number}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-ink-700">{sp?.common_name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono font-bold text-forest-700">{c.percentage.toFixed(2)}%</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <Badge variant="muted">{c.detection_method.toUpperCase()}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-500 hidden xl:table-cell">{c.lab_name}</td>
                    <td className="px-5 py-3.5 text-xs text-ink-400 hidden xl:table-cell">{formatDate(c.analysis_date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {currentUser?.role === 'admin' && (
                        <Button variant="ghost" size="sm" className="text-red-400"
                          onClick={() => { if (confirm('Delete?')) deleteChemistryResult(c.id); }}>
                          Del
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-ink-400 text-sm">No chemistry results found</div>
          )}
        </div>
        <div className="px-5 py-3 bg-cream-50 border-t border-cream-200 text-xs text-ink-400">
          {filtered.length} compound records
        </div>
      </div>
    </div>
  );
}
