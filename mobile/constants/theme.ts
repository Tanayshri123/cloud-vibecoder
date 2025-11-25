/**
 * Modern minimalistic design system for Cloud Vibecoder
 * Inspired by clean, task-management aesthetics
 */

import { Platform } from 'react-native';

// Primary accent colors
export const Accent = {
  primary: '#4361EE', // Vibrant blue
  primaryLight: '#6B83F7',
  primaryDark: '#3651D4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: ['#4361EE', '#7C3AED'],
};

// Neutral colors for light theme
export const LightTheme = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
};

// Neutral colors for dark theme
export const DarkTheme = {
  background: '#0A0A0B',
  backgroundSecondary: '#141416',
  backgroundTertiary: '#1C1C1F',
  surface: '#1C1C1F',
  surfaceElevated: '#252528',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  border: '#27272A',
  borderLight: '#1C1C1F',
  divider: '#27272A',
};

// Legacy Colors export for compatibility
const tintColorLight = Accent.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: LightTheme.text,
    background: LightTheme.background,
    tint: tintColorLight,
    icon: LightTheme.textSecondary,
    tabIconDefault: LightTheme.textTertiary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: DarkTheme.text,
    background: DarkTheme.background,
    tint: tintColorDark,
    icon: DarkTheme.textSecondary,
    tabIconDefault: DarkTheme.textTertiary,
    tabIconSelected: tintColorDark,
  },
};

// Typography
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Typography sizes
export const Typography = {
  // Display sizes - for hero sections
  displayLarge: { fontSize: 48, lineHeight: 56, fontWeight: '800' as const },
  displayMedium: { fontSize: 36, lineHeight: 44, fontWeight: '700' as const },
  displaySmall: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  
  // Headings
  h1: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  
  // Body text
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  
  // Labels and captions
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  labelSmall: { fontSize: 10, lineHeight: 14, fontWeight: '500' as const },
  
  // Large numbers (for progress, stats)
  statLarge: { fontSize: 64, lineHeight: 72, fontWeight: '700' as const },
  statMedium: { fontSize: 48, lineHeight: 56, fontWeight: '700' as const },
  statSmall: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Shadows
export const Shadows = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 6,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};
