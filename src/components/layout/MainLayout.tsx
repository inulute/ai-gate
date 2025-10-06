// src/components/layout/MainLayout.tsx
import { Sidebar } from './Sidebar';
import { useSettings } from '@/context/SettingsContext';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationPanel } from '@/components/NotificationPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect } from 'react';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSettings();
  const { showPanel, setShowPanel, highPriorityNotifications } = useNotifications();
  
  useEffect(() => {
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  }, [settings.theme]);


  useEffect(() => {
    if (highPriorityNotifications.length > 0) {
      console.log('High priority notifications found:', highPriorityNotifications.length);
    }
  }, [highPriorityNotifications]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
      <main className="flex-1 overflow-auto bg-background p-0">
        {children}
      </main>
      <NotificationPanel 
        isOpen={showPanel} 
        onClose={() => setShowPanel(false)} 
      />
    </div>
  );
};