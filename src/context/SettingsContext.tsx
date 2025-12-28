// src/context/SettingsContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LayoutType } from '../types/AITool';
import { DEFAULT_LAYOUT } from '../config/constants';

type Theme = 'light' | 'dark' | 'system';

interface Settings {
  theme: Theme;
  defaultLayout: LayoutType;
  isCollapsed: boolean;
  autostart: boolean;
  defaultTools: string[];
  autoLayout: boolean;
  syncedTabs: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setAutostart: (enabled: boolean) => Promise<void>;
}

const defaultSettings: Settings = {
  theme: 'system',
  defaultLayout: DEFAULT_LAYOUT,
  isCollapsed: true,
  autostart: false,
  defaultTools: ['chatgpt', 'gemini'],
  autoLayout: true,
  syncedTabs: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useLocalStorage<Settings>('app-settings', defaultSettings);

  const settingsWithDefaults = {
    ...defaultSettings,
    ...settings,
    autostart: settings.autostart ?? false,
    defaultTools: settings.defaultTools ?? defaultSettings.defaultTools,
    autoLayout: (settings as any).autoLayout ?? true,
    syncedTabs: (settings as any).syncedTabs ?? true
  };

  useEffect(() => {
    const isDark = settingsWithDefaults.theme === 'dark' || 
      (settingsWithDefaults.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    
    if (settingsWithDefaults.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settingsWithDefaults.theme]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(current => ({ ...current, ...newSettings }));
  };

  const toggleTheme = () => {
    setSettings(current => ({
      ...current,
      theme: current.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const toggleSidebar = () => {
    setSettings(current => ({
      ...current,
      isCollapsed: !current.isCollapsed,
    }));
  };

  const setAutostart = async (enabled: boolean) => {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        await (window as any).electronAPI.setAutostart(enabled);
        await (window as any).electronAPI.setSettings({ ...settingsWithDefaults, autostart: enabled });
      }
      
      setSettings(current => ({
        ...current,
        autostart: enabled,
      }));
    } catch (error) {
      console.error('Error setting autostart:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings: settingsWithDefaults, 
      updateSettings, 
      toggleTheme,
      toggleSidebar,
      setAutostart
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};