// src/components/layout/Header.tsx
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { SettingsPanel } from '../settings/SettingsPanel';
import { useState, useEffect } from 'react';

export const Header = () => {
  const { settings, toggleTheme } = useSettings();
  const [themeIcon, setThemeIcon] = useState<React.ReactNode>(null);
  
  // Smoothly handle theme icon changes
  useEffect(() => {
    let icon;
    
    if (settings.theme === 'dark') {
      icon = <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />;
    } else if (settings.theme === 'light') {
      icon = <Moon className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />;
    } else {
      icon = <Monitor className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />;
    }
    
    setThemeIcon(icon);
  }, [settings.theme]);

  return (
    <header className="sticky-header border-b bg-background/95 py-3 px-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI Gate</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="transition-colors duration-200 rounded-full hover:bg-secondary/80"
          >
            {themeIcon}
          </Button>
          <SettingsPanel />
        </div>
      </div>
    </header>
  );
};