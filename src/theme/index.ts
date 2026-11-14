export const colors = {
  bg: '#0B0C12',
  surface: '#14161F',
  surface2: '#1C1F2B',
  border: '#262A38',
  text: '#F3F4F8',
  muted: '#8A90A6',
  primary: '#7C5CFF',
  primarySoft: 'rgba(124,92,255,0.16)',
  accent: '#2EE6C5',
  accentSoft: 'rgba(46,230,197,0.14)',
  danger: '#FF4D5E',
  dangerSoft: 'rgba(255,77,94,0.16)',
  warn: '#F5B841',
  white: '#FFFFFF',
} as const;

export const radius = { sm: 10, md: 14, lg: 22, pill: 999 } as const;

export const type = {
  title: { fontSize: 30, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.6 },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
};
