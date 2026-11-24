export default function ProgressBar({ value, total, color = 'var(--brand)' }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="progress" title={`${value} of ${total}`}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
