'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export default function NewSpeciesPage() {
  const { addSpecies, currentUser } = useKBIStore();
  const router = useRouter();
  const [form, setForm] = useState({
    scientific_name: '', common_name: '', khmer_name: '',
    family: '', genus: '', description: '',
    native_regions: '', conservation_status: 'Least Concern',
    commercial_importance: '', notes: '',
  });

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'lab_analyst') {
    return (
      <div className="p-6 text-center text-ink-500">
        <p>You do not have permission to add species.</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addSpecies({
      ...form,
      native_regions: form.native_regions.split(',').map(s => s.trim()).filter(Boolean),
    });
    router.push('/species');
  }

  function field(label: string, key: keyof typeof form, type = 'text', opts?: { placeholder?: string; rows?: number }) {
    const isTextarea = opts?.rows;
    const props = {
      id: key,
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
      placeholder: opts?.placeholder ?? '',
      className: 'w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-forest-400 transition-colors',
    };
    return (
      <div>
        <label htmlFor={key} className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">
          {label}
        </label>
        {isTextarea
          ? <textarea {...props} rows={opts?.rows} />
          : <input type={type} {...props} />
        }
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-light text-ink-800">Add New Species</h2>
        <p className="text-sm text-ink-400 mt-1">Register a new plant species in the botanical database.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Taxonomy</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {field('Scientific Name', 'scientific_name', 'text', { placeholder: 'e.g. Mitrella mesnyi' })}
              {field('Common Name', 'common_name', 'text', { placeholder: 'e.g. Rumduol' })}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {field('Khmer Name', 'khmer_name', 'text', { placeholder: 'ក្រមួន' })}
              {field('Family', 'family', 'text', { placeholder: 'e.g. Annonaceae' })}
              {field('Genus', 'genus', 'text', { placeholder: 'e.g. Mitrella' })}
            </div>
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader><p className="text-xs font-medium text-ink-500 tracking-widest uppercase">Details</p></CardHeader>
          <CardBody className="space-y-4">
            {field('Description', 'description', 'text', { rows: 3, placeholder: 'Botanical description and characteristics...' })}
            {field('Native Regions (comma-separated)', 'native_regions', 'text', { placeholder: 'Cambodia, Thailand, Vietnam' })}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 tracking-wide uppercase mb-1.5">Conservation Status</label>
                <select
                  value={form.conservation_status}
                  onChange={e => setForm(p => ({ ...p, conservation_status: e.target.value }))}
                  className="w-full bg-cream-50 border border-cream-300 rounded px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:border-forest-400"
                >
                  {['Least Concern', 'Near Threatened', 'Vulnerable', 'Endangered', 'Critically Endangered', 'Data Deficient'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {field('Commercial Importance', 'commercial_importance', 'text', { placeholder: 'Brief commercial assessment...' })}
            </div>
            {field('Internal Notes', 'notes', 'text', { rows: 3, placeholder: 'Field notes, harvest timing, special conditions...' })}
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Create Species Record</Button>
        </div>
      </form>
    </div>
  );
}
