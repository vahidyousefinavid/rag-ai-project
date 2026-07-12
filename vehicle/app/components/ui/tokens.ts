export const C = {
  green:      '#22C55E',
  greenDark:  '#16A34A',
  greenGlow:  'rgba(34,197,94,0.35)',
  amber:      '#F59E0B',
  red:        '#EF4444',
  blue:       '#3B82F6',

  bg:         '#0A1120',
  bgElevated: '#0D1526',
  heroStart:  '#0C1830',
  heroMid:    '#0F2A28',
  heroEnd:    '#0A1120',

  surface:      'rgba(255,255,255,0.06)',
  surface2:     'rgba(255,255,255,0.03)',
  surfaceSolid: '#111B2E',

  text:   'rgba(240,246,255,0.92)',
  muted:  'rgba(200,215,235,0.60)',
  subtle: 'rgba(200,215,235,0.38)',

  border:       'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
} as const;

export type Status = 'ok' | 'warn' | 'danger' | 'expired';

export const STATUS_THEME: Record<Status, { color: string; bg: string; border: string }> = {
  ok:      { color: '#4ADE80', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.28)' },
  warn:    { color: '#FBBF24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)' },
  danger:  { color: '#FB923C', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.28)' },
  expired: { color: '#F87171', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.28)' },
};

export function statusLabel(status: Status, days: number | null): string {
  if (days === null) return '';
  if (status === 'expired') return 'منقضی شده';
  if (days === 0) return 'امروز';
  return `${days} روز`;
}
