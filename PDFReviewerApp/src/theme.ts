import { Appearance, Platform, ViewStyle } from 'react-native';

/**
 * Single source of truth for the app's visual language. Screens import from
 * here instead of hard-coding colours and spacing, so the look stays
 * consistent and can be adjusted in one place.
 */

const lightColors = {
  // Brand — a saturated blue, so the header blocks read as app chrome rather
  // than as a page banner.
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryDarker: '#1e40af',
  primarySoft: 'rgba(37, 99, 235, 0.10)',
  primarySoftBorder: 'rgba(37, 99, 235, 0.20)',

  // Surfaces
  background: '#f4f6fb',
  surface: '#ffffff',
  surfaceAlt: '#f7f9fd',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  onPrimary: '#ffffff',
  onPrimaryMuted: 'rgba(255, 255, 255, 0.80)',

  // Lines
  border: '#e6ecf5',

  // Feedback
  success: '#10b981',
  successSoft: '#e7f8f1',
  danger: '#ef4444',
  dangerSoft: '#fdecec',
  warning: '#f59e0b',
  warningSoft: '#fef6e7',

  // Per-tool accents, used for tile stripes and achievement badges.
  accentReviewer: '#2563eb',
  accentFlashcards: '#ec4899',
  accentQuiz: '#10b981',
  accentMap: '#f59e0b',
  accentPlanner: '#8b5cf6',
  accentWallet: '#06b6d4',
  accentSchedule: '#f97316',
  accentFiles: '#6366f1',

  // Dark tile background, as used by the category grid on the home screen.
  tile: '#1e293b',
  tileOverlay: 'rgba(15, 23, 42, 0.55)',

  // Bottom tab bar
  tabActive: '#2563eb',
  tabInactive: '#94a3b8',

  /** Filled buttons that are currently unavailable. */
  disabled: '#b6c6e3',
};

/**
 * Dark palette. Only the surfaces and text flip — the brand blue, the accents
 * and the feedback colours stay recognisable, lifted slightly so they hold up
 * against a dark ground.
 */
const darkColors: typeof lightColors = {
  ...lightColors,

  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryDarker: '#1d4ed8',
  primarySoft: 'rgba(59, 130, 246, 0.16)',
  primarySoftBorder: 'rgba(59, 130, 246, 0.32)',

  background: '#0f172a',
  surface: '#1b2436',
  surfaceAlt: '#161f30',

  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#8496ad',

  border: '#2c3a51',

  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.15)',
  danger: '#f87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',

  accentReviewer: '#60a5fa',
  accentFlashcards: '#f472b6',
  accentQuiz: '#34d399',
  accentMap: '#fbbf24',
  accentPlanner: '#a78bfa',
  accentWallet: '#22d3ee',
  accentSchedule: '#fb923c',
  accentFiles: '#818cf8',

  tile: '#0b1220',
  tileOverlay: 'rgba(2, 6, 23, 0.6)',

  tabActive: '#60a5fa',
  tabInactive: '#7c8aa1',

  disabled: '#3d4c66',
};

/**
 * The palette is picked once, when the module first loads.
 *
 * Every screen builds its StyleSheet at module level, and StyleSheet.create
 * freezes the values it is given — so a palette that changed at runtime would
 * not reach any of them. Reading the system setting here instead means dark
 * mode costs one lookup rather than rewriting nineteen stylesheets, at the
 * price of needing the app reopened after the system theme is switched.
 * Appearance returns null before the native module is ready, which falls back
 * to light.
 */
export const isDarkMode = Appearance.getColorScheme() === 'dark';

export const colors = isDarkMode ? darkColors : lightColors;


export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  heading: { fontSize: 19, fontWeight: '700' as const },
  subheading: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  micro: { fontSize: 11, fontWeight: '600' as const },
};

/**
 * Cross-platform elevation. React Native Web maps shadow* props to boxShadow
 * and warns about them, so web gets boxShadow directly instead.
 */
export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const presets = {
    1: { y: 1, blur: 3, opacity: 0.06, elevation: 2 },
    2: { y: 4, blur: 12, opacity: 0.09, elevation: 4 },
    3: { y: 10, blur: 26, opacity: 0.14, elevation: 8 },
  } as const;

  const { y, blur, opacity, elevation } = presets[level];

  if (Platform.OS === 'web') {
    return { boxShadow: `0 ${y}px ${blur}px rgba(31, 36, 55, ${opacity})` } as unknown as ViewStyle;
  }

  return {
    shadowColor: '#1f2437',
    shadowOpacity: opacity,
    shadowOffset: { width: 0, height: y },
    shadowRadius: blur / 2,
    elevation,
  };
}

/** Card surface used across every screen. */
export function card(level: 1 | 2 | 3 = 1): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(level),
  };
}
