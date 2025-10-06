// src/hooks/useShortcutActions.ts
import { useEffect } from 'react';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useAITools } from '@/context/AIToolsContext';

export const useShortcutActions = () => {
  const { registerAction, registerToolHotkeyAction, toolHotkeys } = useShortcuts();
  const { 
    toolInstances, 
    closeToolInstance, 
    closeAllInstances, 
    setLayout,
    updateToolInstance
  } = useAITools();

  useEffect(() => {
    
    registerAction('close-current-tool', () => {
      const activeInstance = toolInstances[toolInstances.length - 1];
      if (activeInstance) {
        closeToolInstance(activeInstance.id);
      }
    });

    registerAction('close-all-tools', () => {
      closeAllInstances();
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

    toolHotkeys.forEach(mapping => {
      registerToolHotkeyAction(mapping.id, () => {
        const idx = toolInstances.findIndex(i => i.toolId === mapping.toolId);
        if (idx >= 0) {
          const instance = toolInstances[idx];
          updateToolInstance(instance.id, { lastActive: new Date() as any });
        }
      });
    });

  }, [registerAction, registerToolHotkeyAction, toolHotkeys, toolInstances, closeToolInstance, closeAllInstances, setLayout, updateToolInstance]);
};
