export type ThemeId = 'dark' | 'noir' | 'neon' | 'blue' | 'green' | 'purple' | 'red' | 'light';

export interface ThemeColors {
  // Backgrounds
  background: string;
  card: string;
  cardHover: string;
  elevated: string;
  surface: string;
  surfaceLight: string;

  // Borders
  border: string;
  borderLight: string;

  // Primary Accent
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;
  primaryContrast: string;

  // Tab bar
  tabBarBg: string;

  // Category Accent Colors
  watchlist: string;
  watched: string;
  watching: string;
  planToWatch: string;
  favorites: string;
  category: {
    watchlist: string;
    watched: string;
    watching: string;
    planToWatch: string;
    favorites: string;
  };

  // Chart & Breakdown Palette
  chartColors: string[];

  // Accents
  purple: string;
  purpleMuted: string;

  // Gold Star Rating
  star: string;
  starEmpty: string;

  // Semantic
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;
  infoMuted: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  // Overlays
  overlay: string;
  overlayLight: string;
}

const COMMON_DEFAULTS = {
  watchlist: '#10B981',
  watched: '#22C55E',
  watching: '#3B82F6',
  planToWatch: '#F97316',
  favorites: '#EF4444',
  category: {
    watchlist: '#10B981',
    watched: '#22C55E',
    watching: '#3B82F6',
    planToWatch: '#F97316',
    favorites: '#EF4444',
  },
  chartColors: ['#14B8A6', '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316', '#EAB308'],
  purple: '#A855F7',
  purpleMuted: 'rgba(168, 85, 247, 0.15)',
  star: '#F5C518',
  starEmpty: '#334155',
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
};

export const THEME_DEFINITIONS: Record<ThemeId, ThemeColors> = {
  // 1. NOIR / MONOCHROME (Minimalist B&W from User Spec Image)
  noir: {
    ...COMMON_DEFAULTS,
    background: '#060606', // [06] PRIMARY HEX 060606 100%
    card: '#121212',
    cardHover: '#181818',
    elevated: '#1A1A1A',
    surface: '#1F1F1F', // [05] QUATERNARY
    surfaceLight: '#262626',
    border: '#242424', // [04] TERTIARY 20%
    borderLight: '#333333',
    primary: '#FFFFFF', // [01] PRIMARY HEX FFFFFF 100%
    primaryDark: '#D4D4D4',
    primaryLight: '#FFFFFF',
    primaryMuted: 'rgba(255, 255, 255, 0.16)',
    primaryContrast: '#000000',
    tabBarBg: '#060606',
    textPrimary: '#FFFFFF', // 100%
    textSecondary: 'rgba(255, 255, 255, 0.64)', // [02] SECONDARY ACTIVE 64%
    textMuted: 'rgba(255, 255, 255, 0.44)', // [03] TERTIARY 44%
    textDisabled: 'rgba(255, 255, 255, 0.20)', // [04] TERTIARY 20%
    star: '#FFFFFF',
    starEmpty: '#333333',
    watchlist: '#FFFFFF',
    watched: '#FFFFFF',
    watching: '#D4D4D4',
    planToWatch: '#A3A3A3',
    favorites: '#FFFFFF',
    category: {
      watchlist: '#FFFFFF',
      watched: '#FFFFFF',
      watching: '#D4D4D4',
      planToWatch: '#A3A3A3',
      favorites: '#FFFFFF',
    },
    chartColors: ['#FFFFFF', '#D4D4D4', '#A3A3A3', '#737373', '#525252', '#333333', '#1F1F1F'],
  },

  // 2. NEON LIME / CYBERPUNK (From User Image Mockup)
  neon: {
    ...COMMON_DEFAULTS,
    background: '#060A0E',
    card: '#0E151D',
    cardHover: '#141E28',
    elevated: '#16222E',
    surface: '#182633',
    surfaceLight: '#223547',
    border: '#172430',
    borderLight: '#263B4E',
    primary: '#22C55E',
    primaryDark: '#16A34A',
    primaryLight: '#4ADE80',
    primaryMuted: 'rgba(34, 197, 94, 0.16)',
    primaryContrast: '#000000',
    tabBarBg: '#080D12',
  },

  // 2. DARK (Netflix Cinema Red Default)
  dark: {
    ...COMMON_DEFAULTS,
    background: '#0B0E14',
    card: '#121620',
    cardHover: '#181E2C',
    elevated: '#1A202E',
    surface: '#1E2536',
    surfaceLight: '#262F44',
    border: '#1E2536',
    borderLight: '#2D374E',
    primary: '#E50914',
    primaryDark: '#B20710',
    primaryLight: '#FF3333',
    primaryMuted: 'rgba(229, 9, 20, 0.15)',
    primaryContrast: '#FFFFFF',
    tabBarBg: '#0D1117',
  },

  // 3. MIDNIGHT BLUE
  blue: {
    ...COMMON_DEFAULTS,
    background: '#020617',
    card: '#0F172A',
    cardHover: '#1E293B',
    elevated: '#1E293B',
    surface: '#334155',
    surfaceLight: '#475569',
    border: '#1E293B',
    borderLight: '#334155',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    primaryMuted: 'rgba(59, 130, 246, 0.16)',
    primaryContrast: '#FFFFFF',
    tabBarBg: '#080E1E',
  },

  // 4. EMERALD FOREST
  green: {
    ...COMMON_DEFAULTS,
    background: '#022C22',
    card: '#064E3B',
    cardHover: '#065F46',
    elevated: '#065F46',
    surface: '#047857',
    surfaceLight: '#059669',
    border: '#0F766E',
    borderLight: '#14B8A6',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#34D399',
    primaryMuted: 'rgba(16, 185, 129, 0.16)',
    primaryContrast: '#FFFFFF',
    tabBarBg: '#031E18',
  },

  // 5. CREATIVE PURPLE
  purple: {
    ...COMMON_DEFAULTS,
    background: '#130826',
    card: '#210E3D',
    cardHover: '#2E1065',
    elevated: '#3B1A6E',
    surface: '#4C1D95',
    surfaceLight: '#5B21B6',
    border: '#4C1D95',
    borderLight: '#6D28D9',
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryMuted: 'rgba(139, 92, 246, 0.16)',
    primaryContrast: '#FFFFFF',
    tabBarBg: '#180B2E',
  },

  // 6. CINEMA RED
  red: {
    ...COMMON_DEFAULTS,
    background: '#1A0404',
    card: '#2D0A0A',
    cardHover: '#3C0E0E',
    elevated: '#450A0A',
    surface: '#5C1212',
    surfaceLight: '#7F1D1D',
    border: '#4D1010',
    borderLight: '#991B1B',
    primary: '#EF4444',
    primaryDark: '#DC2626',
    primaryLight: '#F87171',
    primaryMuted: 'rgba(239, 68, 68, 0.16)',
    primaryContrast: '#FFFFFF',
    tabBarBg: '#1F0606',
  },

  // 7. CLEAN LIGHT
  light: {
    ...COMMON_DEFAULTS,
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardHover: '#F1F5F9',
    elevated: '#FFFFFF',
    surface: '#F1F5F9',
    surfaceLight: '#E2E8F0',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#3B82F6',
    primaryMuted: 'rgba(37, 99, 235, 0.12)',
    primaryContrast: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textDisabled: '#94A3B8',
    tabBarBg: '#FFFFFF',
    starEmpty: '#CBD5E1',
  },
};

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tag?: string;
  description: string;
  color: string;
  accent: string;
}

export const THEME_LIST: ThemeMeta[] = [
  {
    id: 'noir',
    name: 'Noir Monochrome',
    tag: 'B&W',
    description: 'Minimalist Black & White Cinema',
    color: '#060606',
    accent: '#FFFFFF',
  },
  {
    id: 'neon',
    name: 'Neon Lime',
    tag: 'NEW',
    description: 'Cyberpunk OLED Black with Neon Green',
    color: '#060A0E',
    accent: '#22C55E',
  },
  {
    id: 'dark',
    name: 'Dark Cinema',
    description: 'Classic Dark with Netflix Red',
    color: '#0B0E14',
    accent: '#E50914',
  },
  {
    id: 'blue',
    name: 'Midnight Blue',
    description: 'Deep Space with Electric Blue',
    color: '#020617',
    accent: '#3B82F6',
  },
  {
    id: 'green',
    name: 'Emerald Forest',
    description: 'Deep Pine with Emerald Accents',
    color: '#022C22',
    accent: '#10B981',
  },
  {
    id: 'purple',
    name: 'Creative Purple',
    description: 'Mystic Violet with Neon Purple',
    color: '#130826',
    accent: '#8B5CF6',
  },
  {
    id: 'red',
    name: 'Cinema Crimson',
    description: 'Dark Wine with Crimson Accents',
    color: '#1A0404',
    accent: '#EF4444',
  },
  {
    id: 'light',
    name: 'Clean Light',
    description: 'Crisp Light Mode with Blue',
    color: '#F8FAFC',
    accent: '#2563EB',
  },
];

// Live mutable COLORS object initialized with dark theme
export const COLORS: ThemeColors = { ...THEME_DEFINITIONS.dark };

export const applyThemeColors = (themeId: ThemeId): ThemeColors => {
  const chosen = THEME_DEFINITIONS[themeId] || THEME_DEFINITIONS.dark;
  Object.assign(COLORS, chosen);
  return COLORS;
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999, // Pill shape
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
};

// Aliases for compatibility
export const Colors = COLORS;
export const Spacing = SPACING;
export const Radius = RADIUS;
export const FontSize = FONT_SIZE;
