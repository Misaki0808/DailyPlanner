// Tema renkleri ve stiller

export const lightTheme = {
  // ── Gradient'ler (Soft purple/lavender tones – vibrant but not blinding) ──
  primaryGradient: ['#C9B8E8', '#E0D4F5', '#D6CCF0'] as readonly [string, string, ...string[]],
  secondaryGradient: ['#B8A9E0', '#D4C6EF'] as readonly [string, string, ...string[]],
  accentGradient: ['#7C5CBF', '#9B7FD4'] as readonly [string, string, ...string[]],
  warningGradient: ['#E8A838', '#F0C060'] as readonly [string, string, ...string[]],
  successGradient: ['#4CAF7D', '#6BC89B'] as readonly [string, string, ...string[]],
  purpleGradient: ['#8B6FC0', '#A88DD4'] as readonly [string, string, ...string[]],
  blueGradient: ['#5B8DEF', '#7DA6F5'] as readonly [string, string, ...string[]],
  pinkGradient: ['#D4689A', '#E088B0'] as readonly [string, string, ...string[]],
  settingsGradient: ['#C9B8E8', '#D6CCF0', '#E0D4F5'] as readonly [string, string, ...string[]],

  // ── Solid renkler ──
  background: '#EDE5F7',
  cardBackground: 'rgba(255, 255, 255, 0.85)',
  taskCardBackground: '#FFFFFF',
  text: '#2D2040',
  textSecondary: '#6B5C80',
  textMuted: '#A99BBE',
  textOnGradient: '#FFFFFF',
  border: 'rgba(124, 92, 191, 0.15)',

  // ── Header & accent ──
  headerBackground: '#7C5CBF',
  accent: '#7C5CBF',
  accentLight: 'rgba(124, 92, 191, 0.15)',

  // ── Modal renkleri ──
  modalBackground: '#FFFFFF',
  overlayBackground: 'rgba(45, 32, 64, 0.45)',

  // ── Durum renkleri ──
  success: '#4CAF7D',
  warning: '#E8A838',
  error: '#D94F4F',
  info: '#5B8DEF',

  // ── Priority renkleri ──
  priorityHigh: '#D94F4F',
  priorityMedium: '#E8A838',
  priorityLow: '#4CAF7D',

  // ── Switch renkleri ──
  switchTrackOn: 'rgba(76, 175, 125, 0.7)',
  switchTrackOff: 'rgba(0, 0, 0, 0.08)',
  switchThumbOn: '#4CAF7D',
  switchThumbOff: '#F0EAF8',
};

export const darkTheme: Theme = {
  // ── Gradient'ler (Deep navy-charcoal tones) ──
  primaryGradient: ['#0D1117', '#161B22', '#1C2333'],
  secondaryGradient: ['#111820', '#161B22'],
  accentGradient: ['#1D4ED8', '#1E40AF'],
  warningGradient: ['#D29922', '#B8861E'],
  successGradient: ['#3FB950', '#2EA043'],
  purpleGradient: ['#8957E5', '#6E40C9'],
  blueGradient: ['#2563EB', '#1D4ED8'],
  pinkGradient: ['#DB61A2', '#BF4B8A'],
  settingsGradient: ['#0D1117', '#161B22', '#1C2333'],

  // ── Solid renkler ──
  background: '#0D1117',
  cardBackground: 'rgba(22, 27, 34, 0.9)',
  taskCardBackground: '#161B22',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  textOnGradient: '#FFFFFF',
  border: 'rgba(48, 54, 61, 0.8)',

  // ── Header & accent ──
  headerBackground: '#161B22',
  accent: '#1D4ED8',
  accentLight: 'rgba(29, 78, 216, 0.25)',

  // ── Modal renkleri ──
  modalBackground: '#1C2333',
  overlayBackground: 'rgba(0, 0, 0, 0.75)',

  // ── Durum renkleri ──
  success: '#3FB950',
  warning: '#D29922',
  error: '#F85149',
  info: '#2563EB',

  // ── Priority renkleri ──
  priorityHigh: '#F85149',
  priorityMedium: '#D29922',
  priorityLow: '#3FB950',

  // ── Switch renkleri ──
  switchTrackOn: 'rgba(63, 185, 80, 0.7)',
  switchTrackOff: 'rgba(255, 255, 255, 0.1)',
  switchThumbOn: '#3FB950',
  switchThumbOff: '#484F58',
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
