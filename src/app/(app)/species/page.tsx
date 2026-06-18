'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useKBIStore } from '@/lib/store';
import { exportToCSV } from '@/lib/csv';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function SpeciesPage() {
  const { species, deleteSpecies, currentUser } = useKBIStore();
  const [search, setSearch] = useState('');

  const filtered = species.filter(s =>
    s.common_name.toLowerCase().includes(search.toLowerCase()) ||
    s.scientific_name.toLowerCase().includes(search.toLowerCase()) ||
    s.khmer_name.includes(search) ||
    s.family.toLowerCase().includes(search.toLowerCase())
  );

  function handleExport() {
    exportToCSV(species.map(s => ({
      id: s.id,
      scientific_name: s.scientific_name,
      common_name: s.common_name,
      khmer_name: s.khmer_name,
      family: s.family,
      genus: s.genus,
      conservation_status: s.conservation_status,
      commercial_importance: s.commercial_importance,
      native_regions: s.native_regions.join('; '),
      notes: s.notes,
    })), 'kbi-species');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search species, family, Khmer name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white border border-cream-300 rounded px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors"
        />
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <DownloadIcon /> Export CSV
          </Button>
          {(currentUser?.role === 'admin' || currentUser?.role === 'lab_analyst') && (
            <Link href="/species/new">
              <Button size="sm">
                <PlusIcon /> Add Species
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-cream-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Species</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden md:table-cell">Family</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden lg:table-cell">Conservation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase hidden xl:table-cell">Commercial Importance</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-ink-500 tracking-widest uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-cream-50 transition-colors group">
                  <td className="px-5 py-4">
                    <div>
                      <Link href={`/species/${s.id}`} className="font-medium text-ink-800 hover:text-forest-700 transition-colors">
                        {s.common_name}
                      </Link>
                      <p className="text-xs text-ink-400 italic mt-0.5">{s.scientific_name}</p>
                      <p className="text-xs text-brass-600 mt-0.5">{s.khmer_name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <Badge variant="muted">{s.family}</Badge>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <Badge variant={s.conservation_status === 'Least Concern' ? 'forest' : s.conservation_status === 'Vulnerable' ? 'brass' : 'red'}>
                      {s.conservation_status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-600 hidden xl:table-cell max-w-xs truncate">
                    {s.commercial_importance}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/species/${s.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      {currentUser?.role === 'admin' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                          onClick={() => { if (confirm('Delete this species?')) deleteSpecies(s.id); }}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-ink-400">
              <p className="text-sm">No species found</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-cream-50 border-t border-cream-200 text-xs text-ink-400">
          {filtered.length} of {species.length} species
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/></svg>;
}
function DownloadIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" strokeLinecap="round"/></svg>;
}
