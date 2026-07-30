import { Platform, ViewStyle } from 'react-native';

/**
 * Single source of truth for the app's visual language. Screens import from
 * here instead of hard-coding colours and spacing, so the look stays
 * consistent and can be adjusted in one place.
 */

export const colors = {
  // Brand
  primary: '#6d4aa7',
  primaryDark: '#513583',
  primaryDarker: '#3b2560',
  primarySoft: 'rgba(109, 74, 167, 0.10)',
  primarySoftBorder: 'rgba(109, 74, 167, 0.18)',

  // Surfaces
  background: '#f6f4fb',
  surface: '#ffffff',
  surfaceAlt: '#faf8ff',

  // Text
  textPrimary: '#1f2437',
  textSecondary: '#5b6178',
  textMuted: '#8b90a4',
  onPrimary: '#ffffff',
  onPrimaryMuted: 'rgba(255, 255, 255, 0.78)',

  // Lines
  border: '#e8e5f2',

  // Feedback
  success: '#1f9d6b',
  successSoft: '#e4f7ef',
  danger: '#d94a4a',
  dangerSoft: '#fdeced',
  warning: '#e0a012',
  warningSoft: '#fdf5e3',

  // Per-service accents
  accentReviewer: '#4a7fd4',
  accentFlashcards: '#c8657f',
  accentQuiz: '#3f9b8c',
  accentMap: '#d08a3e',
};

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
