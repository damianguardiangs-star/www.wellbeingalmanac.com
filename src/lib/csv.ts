export function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string): void {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]));
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
