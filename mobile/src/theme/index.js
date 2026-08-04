// theme/index.js — Design tokens for AI Smart Dine mobile app
export const colors = {
  // Backgrounds
  bg: '#050505',
  bgCard: '#111111',
  bgSecondary: '#0d0d0d',
  bgGlass: 'rgba(255,255,255,0.03)',

  // Accents
  green: '#10b981',
  greenLight: '#34d399',
  greenDark: '#059669',
  greenGlow: 'rgba(16,185,129,0.15)',

  // Status
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',

  // Text
  textPrimary: '#f0f0f0',
  textSecondary: '#888',
  textMuted: '#555',

  // Borders
  border: 'rgba(255,255,255,0.07)',
  borderActive: 'rgba(16,185,129,0.4)',

  // Tables
  tableAvailable: '#10b981',
  tableOccupied: '#ef4444',
  tableReserved: '#f59e0b',
  tableCleaning: '#3b82f6',
};

export const typography = {
  fontFamily: 'System',
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, display: 32 },
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  green: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const gradients = {
  green: ['#10b981', '#059669'],
  dark: ['#111111', '#0d0d0d'],
  card: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'],
};

export default { colors, typography, spacing, radius, shadows, gradients };
