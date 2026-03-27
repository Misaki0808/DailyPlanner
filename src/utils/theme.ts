// Tema renkleri ve stiller

export const lightTheme = {
  // ── Gradient'ler (Açık mor / lavender + beyaz tonları) ──
  primaryGradient: ['#F3EEFF', '#EDE5FA', '#E8DEFF'] as readonly [string, string, ...string[]],
  secondaryGradient: ['#EDE5FA', '#E0D4F7'] as readonly [string, string, ...string[]],
  accentGradient: ['#7C3AED', '#6D28D9'] as readonly [string, string, ...string[]],
  warningGradient: ['#D97706', '#B45309'] as readonly [string, string, ...string[]],
  successGradient: ['#059669', '#047857'] as readonly [string, string, ...string[]],
  purpleGradient: ['#7C3AED', '#5B21B6'] as readonly [string, string, ...string[]],
  blueGradient: ['#4F46E5', '#4338CA'] as readonly [string, string, ...string[]],
  pinkGradient: ['#DB2777', '#BE185D'] as readonly [string, string, ...string[]],
  settingsGradient: ['#F3EEFF', '#EDE5FA', '#E8DEFF'] as readonly [string, string, ...string[]],

  // ── Solid renkler ──
  background: '#F8F5FF',
  cardBackground: '#FFFFFF',
  taskCardBackground: '#FFFFFF',
  text: '#1E1033',
  textSecondary: '#5B3FA0',
  textMuted: '#9F86C0',
  textOnGradient: '#FFFFFF',
  border: 'rgba(124, 58, 237, 0.12)',

  // ── Header & accent ──
  headerBackground: '#7C3AED',
  accent: '#7C3AED',
  accentLight: 'rgba(124, 58, 237, 0.10)',

  // ── Modal renkleri ──
  modalBackground: '#FFFFFF',
  overlayBackground: 'rgba(30, 16, 51, 0.40)',

  // ── Durum renkleri ──
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#4F46E5',

  // ── Priority renkleri ──
  priorityHigh: '#DC2626',
  priorityMedium: '#D97706',
  priorityLow: '#059669',

  // ── Switch renkleri ──
  switchTrackOn: 'rgba(5, 150, 105, 0.6)',
  switchTrackOff: 'rgba(124, 58, 237, 0.15)',
  switchThumbOn: '#059669',
  switchThumbOff: '#C4B5FD',
};

export const darkTheme: Theme = {
  // ── Gradient'ler (Koyu mor + siyah tonları) ──
  primaryGradient: ['#0D0715', '#130D20', '#180E2A'],
  secondaryGradient: ['#0D0715', '#130D20'],
  accentGradient: ['#7C3AED', '#6D28D9'],
  warningGradient: ['#F59E0B', '#D97706'],
  successGradient: ['#10B981', '#059669'],
  purpleGradient: ['#8B5CF6', '#7C3AED'],
  blueGradient: ['#6366F1', '#4F46E5'],
  pinkGradient: ['#EC4899', '#DB2777'],
  settingsGradient: ['#0D0715', '#130D20', '#180E2A'],

  // ── Solid renkler ──
  background: '#0A0612',
  cardBackground: 'rgba(40, 20, 70, 0.95)',
  taskCardBackground: '#1E0F3A',
  text: '#FFFFFF',
  textSecondary: '#C4B5FD',
  textMuted: '#7C6AAF',
  textOnGradient: '#FFFFFF',
  border: 'rgba(139, 92, 246, 0.40)',

  // ── Header & accent ──
  headerBackground: '#130D20',
  accent: '#8B5CF6',
  accentLight: 'rgba(139, 92, 246, 0.25)',

  // ── Modal renkleri ──
  modalBackground: '#200E40',
  overlayBackground: 'rgba(0, 0, 0, 0.75)',

  // ── Durum renkleri ──
  success: '#10B981',
  warning: '#F59E0B',
  error: '#F87171',
  info: '#A5B4FC',

  // ── Priority renkleri ──
  priorityHigh: '#F87171',
  priorityMedium: '#FBBF24',
  priorityLow: '#34D399',

  // ── Switch renkleri ──
  switchTrackOn: 'rgba(16, 185, 129, 0.65)',
  switchTrackOff: 'rgba(139, 92, 246, 0.30)',
  switchThumbOn: '#10B981',
  switchThumbOff: '#7C6AAF',
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
