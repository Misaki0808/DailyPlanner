// Tema renkleri ve stiller

export const lightTheme = {
  // Gradient'ler (LinearGradient colors prop'u için)
  primaryGradient: ['#667eea', '#764ba2', '#f093fb'] as readonly [string, string, ...string[]],
  secondaryGradient: ['#4facfe', '#00f2fe', '#43e97b'] as readonly [string, string, ...string[]],
  accentGradient: ['#f093fb', '#f5576c'] as readonly [string, string, ...string[]],
  warningGradient: ['#ff6b6b', '#ee5a6f'] as readonly [string, string, ...string[]],
  successGradient: ['#43e97b', '#38f9d7'] as readonly [string, string, ...string[]],
  purpleGradient: ['#667eea', '#764ba2'] as readonly [string, string, ...string[]],
  blueGradient: ['#4facfe', '#00f2fe'] as readonly [string, string, ...string[]],
  pinkGradient: ['#fa709a', '#fee140'] as readonly [string, string, ...string[]],
  settingsGradient: ['#fa709a', '#fee140', '#30cfd0'] as readonly [string, string, ...string[]],

  // Solid renkler
  background: '#f5f5f5',
  cardBackground: 'rgba(255, 255, 255, 0.25)',
  taskCardBackground: 'rgba(255, 255, 255, 0.9)',
  text: '#333',
  textSecondary: '#666',
  textMuted: '#999',
  textOnGradient: '#fff',
  border: 'rgba(255, 255, 255, 0.3)',

  // Modal renkleri
  modalBackground: 'rgba(255, 255, 255, 0.95)',
  overlayBackground: 'rgba(0, 0, 0, 0.6)',

  // Durum renkleri
  success: '#43e97b',
  warning: '#feca57',
  error: '#ff6b6b',
  info: '#4facfe',

  // Priority renkleri
  priorityHigh: '#F44336',
  priorityMedium: '#FFC107',
  priorityLow: '#4CAF50',

  // Switch renkleri
  switchTrackOn: 'rgba(67, 233, 123, 0.7)',
  switchTrackOff: 'rgba(255, 255, 255, 0.3)',
  switchThumbOn: '#43e97b',
  switchThumbOff: '#f4f3f4',
};

export const darkTheme: Theme = {
  // Gradient'ler (koyu versiyonlar)
  primaryGradient: ['#2a2d5a', '#1a1a2e', '#0f0f1e'],
  secondaryGradient: ['#1a3a52', '#0d2438', '#0a1929'],
  accentGradient: ['#7d3c98', '#6c3483'],
  warningGradient: ['#a93226', '#922b21'],
  successGradient: ['#1a7a42', '#145e33'],
  purpleGradient: ['#3a3d7a', '#2a2d5a'],
  blueGradient: ['#1a5a8a', '#0d3a5a'],
  pinkGradient: ['#8a3a5a', '#6a2a4a'],
  settingsGradient: ['#2a2d5a', '#1a1a2e', '#0f0f1e'],

  // Solid renkler
  background: '#0f0f1e',
  cardBackground: 'rgba(42, 45, 90, 0.6)',
  taskCardBackground: 'rgba(50, 50, 70, 0.95)',
  text: '#e0e0e0',
  textSecondary: '#b0b0b0',
  textMuted: '#777',
  textOnGradient: '#fff',
  border: 'rgba(255, 255, 255, 0.1)',

  // Modal renkleri
  modalBackground: 'rgba(30, 30, 50, 0.95)',
  overlayBackground: 'rgba(0, 0, 0, 0.8)',

  // Durum renkleri (biraz daha koyu)
  success: '#2ecc71',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',

  // Priority renkleri
  priorityHigh: '#e74c3c',
  priorityMedium: '#f39c12',
  priorityLow: '#2ecc71',

  // Switch renkleri
  switchTrackOn: 'rgba(46, 204, 113, 0.7)',
  switchTrackOff: 'rgba(255, 255, 255, 0.15)',
  switchThumbOn: '#2ecc71',
  switchThumbOff: '#888',
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
