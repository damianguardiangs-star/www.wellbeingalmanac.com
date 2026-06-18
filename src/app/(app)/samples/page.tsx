'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useKBIStore } from '@/lib/store';
import { exportToCSV } from '@/lib/csv';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate, plantPartLabel } from '@/lib/utils';

const PROVINCES = ['All', 'Siem Reap', 'Kampong Chhnang', 'Mondulkiri', 'Kampot', 'Phnom Penh'];

export default function SamplesPage() {
  const { plantSamples, species, collectionSites, deleteSample, currentUser } = useKBIStore();
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterProvince, setFilterProvince] = useState('All');

  const filtered = plantSamples.filter(s => {
    const sp = species.find(x => x.id === s.species_id);
    const site = collectionSites.find(x => x.id === s.collection_site_id);
    const matchSearch = !search ||
      s.sample_code.toLowerCase().includes(search.toLowerCase()) ||
      sp?.common_name.toLowerCase().includes(search.toLowerCase()) ||
      s.collector_name.toLowerCase().includes(search.toLowerCase());
    const matchSpecies = !filterSpecies || s.species_id === filterSpecies;
    const matchProvince = filterProvince === 'All' || site?.province === filterProvince;
    return matchSearch && matchSpecies && matchProvince;
  });

  function handleExport() {
    exportToCSV(filtered.map(s => {
      const sp = species.find(x => x.id === s.species_id);
      const site = collectionSites.find(x => x.id === s.collection_site_id);
      return {
        sample_code: s.sample_code,
        species: sp?.common_name ?? '',
        scientific_name: sp?.scientific_name ?? '',
        province: site?.province ?? '',
        collection_site: site?.name ?? '',
        collector: s.collector_name,
        collected_at: s.collected_at,
        plant_part: s.plant_part,
        flowering_stage: s.flowering_stage,
        source_type: s.source_type,
        quantity_g: s.quantity_g,
        temperature_c: s.temperature_c ?? '',
        humidity_pct: s.humidity_pct ?? '',
        notes: s.notes,
      };
    }), 'kbi-samples');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search code, species, collector..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white border border-cream-300 rounded px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
        />
        <select
          value={filterSpecies}
          onChange={e => setFilterSpecies(e.target.value)}
          className="bg-white border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400"
        >
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
        </select>
        <select
          value={filterProvince}
          onChange={e => setFilterProvince(e.target.value)}
          className="bg-white border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400"
        >
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
          {(currentUser?.role === 'admin' || currentUser?.role === 'field_collector') && (
            <Link href="/samples/new"><Button size="sm">+ Add Sample</Button></Link>
          )}
        </div>
      </div>

      <div className="bg-white border border-cream-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Sample Code</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Species</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden md:table-cell">Province</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden lg:table-cell">Part</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden lg:table-cell">Qty</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Collector</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {filtered.map(s => {
                const sp = species.find(x => x.id === s.species_id);
                const site = collectionSites.find(x => x.id === s.collection_site_id);
                return (
                  <tr key={s.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/samples/${s.id}`} className="font-mono text-xs text-ink-700 hover:text-forest-700">{s.sample_code}</Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-ink-800">{sp?.common_name}</p>
                      <p className="text-xs text-ink-400 italic">{sp?.scientific_name}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Badge variant="forest">{site?.province}</Badge>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <Badge variant="muted">{plantPartLabel(s.plant_part)}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-ink-700 hidden lg:table-cell">{s.quantity_g}g</td>
                    <td className="px-5 py-3.5 hidden xl:table-cell text-ink-600 text-xs">{s.collector_name}</td>
                    <td className="px-5 py-3.5 hidden xl:table-cell text-ink-400 text-xs">{formatDate(s.collected_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/samples/${s.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                        {currentUser?.role === 'admin' && (
                          <Button variant="ghost" size="sm" className="text-red-500"
                            onClick={() => { if (confirm('Delete sample?')) deleteSample(s.id); }}>
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
            <div className="text-center py-16 text-ink-400 text-sm">No samples found</div>
          )}
        </div>
        <div className="px-5 py-3 bg-cream-50 border-t border-cream-200 text-xs text-ink-400">
          {filtered.length} of {plantSamples.length} samples
        </div>
      </div>
    </div>
  );
}
