// src/hooks/useShortcutActions.ts
import { useEffect } from 'react';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useAITools } from '@/context/AIToolsContext';
import { useSettings } from '@/context/SettingsContext';
import { WEBVIEW_ZOOM_EVENT, type WebviewZoomAction } from '@/lib/webviewZoom';

export const useShortcutActions = () => {
  const { registerAction, registerToolHotkeyAction, toolHotkeys } = useShortcuts();
  const { settings } = useSettings();
  const { 
    tools,
    toolInstances, 
    layout,
    activePanelId,
    closeToolInstance, 
    closeAllInstances, 
    restoreLastClosed,
    setLayout,
    updateToolInstance,
    focusInstance,
    setActivePanelTab,
    getActivePanelInstance,
    getInstancesByPanel,
    createInstanceInPanel
  } = useAITools();

  useEffect(() => {
    const visibleActivePanelId = activePanelId < parseInt(layout) ? activePanelId : 0;

    /** Sends a browser zoom command to the active provider webview. */
    const dispatchWebviewZoom = (action: WebviewZoomAction) => {
      const activeInstance = getActivePanelInstance(visibleActivePanelId);
      if (!activeInstance) return;
      window.dispatchEvent(new CustomEvent(WEBVIEW_ZOOM_EVENT, {
        detail: { instanceId: activeInstance.id, action },
      }));
    };
    
    registerAction('close-current-tool', () => {
      const activeInstance = getActivePanelInstance(visibleActivePanelId);
      if (activeInstance) {
        closeToolInstance(activeInstance.id);
      }
    });

    registerAction('close-all-tools', () => {
      closeAllInstances();
    });

    registerAction('undo-close-tool', () => {
      restoreLastClosed();
    });

    registerAction('browser-zoom-in', () => {
      dispatchWebviewZoom('in');
    });
    registerAction('browser-zoom-out', () => {
      dispatchWebviewZoom('out');
    });
    registerAction('browser-zoom-reset', () => {
      dispatchWebviewZoom('reset');
    });

    registerAction('layout-single', () => {
      setLayout('1');
    });
    registerAction('layout-double', () => {
      setLayout('2');
    });
    registerAction('layout-triple', () => {
      setLayout('3');
    });

    Array.from({ length: 9 }).forEach((_, index) => {
      registerAction(`switch-tab-${index + 1}`, () => {
        const visibleInstances = settings.syncedTabs ? toolInstances : getInstancesByPanel(visibleActivePanelId);
        const instance = visibleInstances[index];
        if (instance) {
          setActivePanelTab(visibleActivePanelId, instance.id);
          focusInstance(instance.id);
        }
      });
    });

    tools.forEach((tool, index) => {
      registerAction(`new-tool-tab-${index + 1}`, () => {
        createInstanceInPanel(tool, visibleActivePanelId);
      });
    });

    toolHotkeys.forEach(mapping => {
      registerToolHotkeyAction(mapping.id, () => {
        const idx = toolInstances.findIndex(i => i.toolId === mapping.toolId);
        if (idx >= 0) {
          const instance = toolInstances[idx];
          updateToolInstance(instance.id, { lastActive: new Date() });
          setActivePanelTab(instance.panelId, instance.id);
          focusInstance(instance.id);
        }
      });
    });

  }, [registerAction, registerToolHotkeyAction, toolHotkeys, tools, toolInstances, layout, activePanelId, settings.syncedTabs, closeToolInstance, closeAllInstances, restoreLastClosed, setLayout, updateToolInstance, focusInstance, setActivePanelTab, getActivePanelInstance, getInstancesByPanel, createInstanceInPanel]);
};
