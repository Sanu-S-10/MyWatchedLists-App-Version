import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  COLORS,
  THEME_DEFINITIONS,
  THEME_LIST,
  ThemeColors,
  ThemeId,
  ThemeMeta,
  applyThemeColors,
} from '../constants/theme';
import { storage } from '../services/storage';

export interface ThemeContextValue {
  theme: ThemeId;
  colors: ThemeColors;
  setTheme: (newTheme: ThemeId) => Promise<void>;
  themes: ThemeMeta[];
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>('dark');
  const [colors, setColors] = useState<ThemeColors>({ ...COLORS });

  // Initialize from local mobile storage only (independent from shared website backend)
  useEffect(() => {
    let isMounted = true;
    const initTheme = async () => {
      try {
        const saved = await storage.getTheme();
        const initialTheme: ThemeId =
          saved && THEME_DEFINITIONS[saved as ThemeId] ? (saved as ThemeId) : 'dark';

        if (isMounted) {
          const applied = applyThemeColors(initialTheme);
          setThemeState(initialTheme);
          setColors({ ...applied });
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    };

    initTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = useCallback(
    async (newTheme: ThemeId) => {
      if (!THEME_DEFINITIONS[newTheme]) return;

      const updatedColors = applyThemeColors(newTheme);
      setThemeState(newTheme);
      setColors({ ...updatedColors });

      // Persist locally to device storage only
      await storage.setTheme(newTheme);
    },
    []
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        setTheme,
        themes: THEME_LIST,
        isDark: theme !== 'light',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      colors: COLORS,
      setTheme: async () => {},
      themes: THEME_LIST,
      isDark: true,
    };
  }
  return context;
};
