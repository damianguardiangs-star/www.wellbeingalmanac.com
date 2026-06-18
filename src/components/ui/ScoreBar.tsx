interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
}

export default function ScoreBar({ label, value, max = 10 }: ScoreBarProps) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-500 w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 score-bar">
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-ink-700 w-6 text-right">{value}</span>
    </div>
  );
}
