// src/App.tsx
import { useEffect } from 'react';
import { AIToolsProvider } from './context/AIToolsContext';
import { SettingsProvider } from './context/SettingsContext';
import { ShortcutsProvider } from './context/ShortcutsContext';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from "@/components/ui/toaster";

import { WorkspaceGrid } from './components/workspace/WorkspaceGrid';
import { KeyboardShortcuts } from './components/ui/keyboard-shortcuts';
import { ShortcutHandler } from './components/ShortcutHandler';
import { UpdateProvider } from './context/UpdateContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {

  useEffect(() => {
    if (!sessionStorage.getItem('app-loaded')) {
      sessionStorage.removeItem('app-initialized');
      sessionStorage.setItem('app-loaded', 'true');
      
      console.log('App freshly loaded, ready to apply default layout settings');
    }
    
    return () => {
      sessionStorage.removeItem('app-loaded');
    };
  }, []);

  return (
    <SettingsProvider>
      <ShortcutsProvider>
        <AIToolsProvider>
          <UpdateProvider>
            <NotificationProvider>
              <MainLayout>
                <ShortcutHandler />
                <WorkspaceGrid />
              </MainLayout>
              <Toaster />
              <KeyboardShortcuts />
            </NotificationProvider>
          </UpdateProvider>
        </AIToolsProvider>
      </ShortcutsProvider>
    </SettingsProvider>
  );
}

export default App;