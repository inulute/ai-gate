// src/context/ShortcutsContext.tsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultKeys: string[];
  keys: string[];
  enabled: boolean;
  action: () => void;
}

interface ShortcutsContextType {
  shortcuts: Shortcut[];
  updateShortcut: (id: string, keys: string[]) => void;
  toggleShortcut: (id: string) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
  getShortcutByKeys: (keys: string[]) => Shortcut | undefined;
  registerAction: (shortcutId: string, action: () => void) => void;
  toolHotkeys: ToolHotkey[];
  addToolHotkey: (mapping: ToolHotkey) => void;
  updateToolHotkey: (id: string, mapping: Partial<ToolHotkey>) => void;
  removeToolHotkey: (id: string) => void;
  registerToolHotkeyAction: (id: string, action: () => void) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export interface ToolHotkey {
  id: string;
  keys: string[];
  toolId: string;
  enabled: boolean;
}

const defaultShortcuts: Omit<Shortcut, 'action'>[] = [
  {
    id: 'close-current-tool',
    name: 'Close Current Tool',
    description: 'Close the currently active tool',
    category: 'Tool Management',
    defaultKeys: ['Ctrl', 'w'],
    keys: ['Ctrl', 'w'],
    enabled: true,
  },
  {
    id: 'close-all-tools',
    name: 'Close All Tools',
    description: 'Close all unpinned tools',
    category: 'Tool Management',
    defaultKeys: ['Ctrl', 'Shift', 'w'],
    keys: ['Ctrl', 'Shift', 'w'],
    enabled: true,
  },
  {
    id: 'undo-close-tool',
    name: 'Undo Close Tool',
    description: 'Restore the most recently closed tool',
    category: 'Tool Management',
    defaultKeys: ['Ctrl', 'z'],
    keys: ['Ctrl', 'z'],
    enabled: true,
  },

  {
    id: 'layout-single',
    name: 'Single Panel Layout',
    description: 'Switch to single panel layout',
    category: 'Layout',
    defaultKeys: ['Alt', '1'],
    keys: ['Alt', '1'],
    enabled: true,
  },
  {
    id: 'layout-double',
    name: 'Two Panel Layout',
    description: 'Switch to two panel layout',
    category: 'Layout',
    defaultKeys: ['Alt', '2'],
    keys: ['Alt', '2'],
    enabled: true,
  },
  {
    id: 'layout-triple',
    name: 'Three Panel Layout',
    description: 'Switch to three panel layout',
    category: 'Layout',
    defaultKeys: ['Alt', '3'],
    keys: ['Alt', '3'],
    enabled: true,
  },

  {
    id: 'show-shortcuts',
    name: 'Show Shortcuts',
    description: 'Display keyboard shortcuts help',
    category: 'General',
    defaultKeys: ['Ctrl', '?'],
    keys: ['Ctrl', '?'],
    enabled: true,
  },
  {
    id: 'tool-hotkeys',
    name: 'Tool Hotkeys',
    description: 'Configure custom key combos to focus/open your tools',
    category: 'Tool Switching',
    defaultKeys: [],
    keys: [],
    enabled: true,
  },
];

export const ShortcutsProvider = ({ children }: { children: React.ReactNode }) => {
  const [shortcuts, setShortcuts] = useLocalStorage<Shortcut[]>('keyboard-shortcuts', []);
  const actionsRef = useRef<Map<string, () => void>>(new Map());
  const toolHotkeyActionsRef = useRef<Map<string, () => void>>(new Map());
  const [toolHotkeys, setToolHotkeys] = useLocalStorage<ToolHotkey[]>('tool-hotkeys-list', []);

  useEffect(() => {
    if (shortcuts.length === 0) {
      const initializedShortcuts: Shortcut[] = defaultShortcuts.map(shortcut => ({
        ...shortcut,
        action: () => {},
      }));
      setShortcuts(initializedShortcuts);
      return;
    }

    const withoutOldSlots = shortcuts.filter(s => {
      const isLegacyId = s.id.startsWith('tool-slot-') || s.id.startsWith('switch-to-tool-') || s.id.startsWith('switch_tool_');
      const isLegacyCategory = s.category === 'Tool Switching' && s.id !== 'tool-hotkeys';
      return !isLegacyId && !isLegacyCategory;
    });
    const hasToolHotkeys = withoutOldSlots.some(s => s.id === 'tool-hotkeys');
    let migrated = withoutOldSlots;
    if (!hasToolHotkeys) {
      const toolHotkeysDefault = defaultShortcuts.find(s => s.id === 'tool-hotkeys');
      if (toolHotkeysDefault) {
        migrated = [
          ...withoutOldSlots,
          { ...toolHotkeysDefault, action: () => {} }
        ];
      }
    }

    const missingEssentials = defaultShortcuts.filter(d => !migrated.some(s => s.id === d.id));
    if (missingEssentials.length > 0 || migrated.length !== shortcuts.length) {
      setShortcuts([
        ...migrated,
        ...missingEssentials.map(s => ({ ...s, action: () => {} }))
      ]);
    }
  }, [shortcuts, setShortcuts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const pressedKeys: string[] = [];
      
      if (event.ctrlKey) pressedKeys.push('Ctrl');
      if (event.altKey) pressedKeys.push('Alt');
      if (event.shiftKey) pressedKeys.push('Shift');
      if (event.metaKey) pressedKeys.push('Meta');
      
      if (event.key && event.key !== 'Control' && event.key !== 'Alt' && 
          event.key !== 'Shift' && event.key !== 'Meta') {
        let key = event.key;
        if (key === ' ') key = 'Space';
        if (key === 'ArrowUp') key = 'ArrowUp';
        if (key === 'ArrowDown') key = 'ArrowDown';
        if (key === 'ArrowLeft') key = 'ArrowLeft';
        if (key === 'ArrowRight') key = 'ArrowRight';
        if (key === 'Enter') key = 'Enter';
        if (key === 'Escape') key = 'Escape';
        if (key === 'Tab') key = 'Tab';
        if (key === 'Backspace') key = 'Backspace';
        if (key === 'Delete') key = 'Delete';
        if (key === 'Home') key = 'Home';
        if (key === 'End') key = 'End';
        if (key === 'PageUp') key = 'PageUp';
        if (key === 'PageDown') key = 'PageDown';
        
        pressedKeys.push(key);
      }

      const matchingShortcut = shortcuts.find(shortcut => 
        shortcut.enabled && 
        shortcut.keys.length === pressedKeys.length &&
        shortcut.keys.every((key, index) => key.toLowerCase() === pressedKeys[index]?.toLowerCase())
      );

      if (matchingShortcut) {
        event.preventDefault();
        const action = actionsRef.current.get(matchingShortcut.id);
        if (action) {
          action();
        }
        return;
      }

      const mapping = toolHotkeys.find(m => m.enabled && m.keys.length === pressedKeys.length && m.keys.every((k, i) => k.toLowerCase() === pressedKeys[i]?.toLowerCase()));
      if (mapping) {
        const action = toolHotkeyActionsRef.current.get(mapping.id);
        if (action) {
          event.preventDefault();
          action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const registerAction = (shortcutId: string, action: () => void) => {
    actionsRef.current.set(shortcutId, action);
  };

  const registerToolHotkeyAction = (id: string, action: () => void) => {
    toolHotkeyActionsRef.current.set(id, action);
  };

  const addToolHotkey = (mapping: ToolHotkey) => setToolHotkeys(prev => [...prev, mapping]);
  const updateToolHotkey = (id: string, mapping: Partial<ToolHotkey>) => setToolHotkeys(prev => prev.map(m => m.id === id ? { ...m, ...mapping } : m));
  const removeToolHotkey = (id: string) => setToolHotkeys(prev => prev.filter(m => m.id !== id));

  const updateShortcut = (id: string, keys: string[]) => {
    setShortcuts(prev => 
      prev.map(shortcut => 
        shortcut.id === id ? { ...shortcut, keys } : shortcut
      )
    );
  };

  const toggleShortcut = (id: string) => {
    setShortcuts(prev => 
      prev.map(shortcut => 
        shortcut.id === id ? { ...shortcut, enabled: !shortcut.enabled } : shortcut
      )
    );
  };

  const resetShortcut = (id: string) => {
    const defaultShortcut = defaultShortcuts.find(s => s.id === id);
    if (defaultShortcut) {
      updateShortcut(id, defaultShortcut.defaultKeys);
    }
  };

  const resetAllShortcuts = () => {
    const resetShortcuts: Shortcut[] = defaultShortcuts.map(shortcut => ({
      ...shortcut,
      action: () => {},
    }));
    setShortcuts(resetShortcuts);
  };

  const getShortcutByKeys = (keys: string[]): Shortcut | undefined => {
    return shortcuts.find(shortcut => 
      shortcut.enabled && 
      shortcut.keys.length === keys.length &&
      shortcut.keys.every((key, index) => key.toLowerCase() === keys[index]?.toLowerCase())
    );
  };


  const contextValue: ShortcutsContextType = {
    shortcuts,
    updateShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
    getShortcutByKeys,
    registerAction,
    toolHotkeys,
    addToolHotkey,
    updateToolHotkey,
    removeToolHotkey,
    registerToolHotkeyAction,
  };

  return (
    <ShortcutsContext.Provider value={contextValue}>
      {children}
    </ShortcutsContext.Provider>
  );
};

export const useShortcuts = () => {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return context;
};
