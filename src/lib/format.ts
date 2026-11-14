export function callDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

export function relativeTime(then: number, now = Date.now()): string {
  const diff = Math.round((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '');
}
