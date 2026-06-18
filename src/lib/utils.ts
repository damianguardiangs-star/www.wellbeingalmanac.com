export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatYield(pct: number): string {
  return `${pct.toFixed(3)}%`;
}

export function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-700';
  if (score >= 6) return 'text-amber-700';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
}

export function scoreBg(score: number): string {
  if (score >= 8) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (score >= 6) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (score >= 4) return 'bg-orange-50 text-orange-800 border-orange-200';
  return 'bg-red-50 text-red-800 border-red-200';
}

export function extractionMethodLabel(method: string): string {
  const map: Record<string, string> = {
    steam_distillation: 'Steam Distillation',
    co2_extraction: 'CO₂ Extraction',
    ethanol_tincture: 'Ethanol Tincture',
    enfleurage: 'Enfleurage',
    solvent_extraction: 'Solvent Extraction',
    maceration: 'Maceration',
    cold_press: 'Cold Press',
  };
  return map[method] ?? method;
}

export function plantPartLabel(part: string): string {
  const map: Record<string, string> = {
    flower: 'Flower', leaf: 'Leaf', bark: 'Bark', root: 'Root',
    resin: 'Resin', seed: 'Seed', wood: 'Wood', whole_plant: 'Whole Plant',
  };
  return map[part] ?? part;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrator',
    field_collector: 'Field Collector',
    lab_analyst: 'Lab Analyst',
    commercial_reviewer: 'Commercial Reviewer',
  };
  return map[role] ?? role;
}
