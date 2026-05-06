// src/context/ShortcutsContext.tsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  buildDefaultShortcuts,
  buildShortcutPreset,
  comboMatchesKeyboardEvent,
  combosEqual,
  getDefaultShortcutModifier,
  type ShortcutPreset,
  shortcutSequencesEqual,
} from '@/lib/shortcutUtils';

export type ShortcutMode = 'standard' | 'prefix';
export type KeyCombo = string[];

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  category: string;
  mode: ShortcutMode;
  defaultKeys: KeyCombo[];
  keys: KeyCombo[];
  enabled: boolean;
}

export interface ToolHotkey {
  id: string;
  keys: string[];
  toolId: string;
  enabled: boolean;
}

interface ShortcutIpcConfig {
  id: string;
  name: string;
  mode: ShortcutMode;
  keys: KeyCombo[];
}

interface ShortcutIpcPayload {
  type: 'action' | 'prefix-active' | 'prefix-cancel';
  shortcutId?: string;
}

interface ActivePrefix {
  shortcuts: Shortcut[];
  nextStep: number;
}

interface ShortcutsContextType {
  shortcuts: Shortcut[];
  setShortcutRecording: (isRecording: boolean) => void;
  updateShortcut: (id: string, keys: KeyCombo[], mode?: ShortcutMode) => void;
  toggleShortcut: (id: string) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
  applyShortcutPreset: (preset: ShortcutPreset) => void;
  getShortcutByKeys: (keys: KeyCombo[]) => Shortcut | undefined;
  registerAction: (shortcutId: string, action: () => void) => void;
  toolHotkeys: ToolHotkey[];
  addToolHotkey: (mapping: ToolHotkey) => void;
  updateToolHotkey: (id: string, mapping: Partial<ToolHotkey>) => void;
  removeToolHotkey: (id: string) => void;
  registerToolHotkeyAction: (id: string, action: () => void) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);
const defaultShortcuts = buildDefaultShortcuts();
const primaryModifier = getDefaultShortcutModifier();
const legacyDefaultKeysById: Record<string, string[]> = {
  'close-current-tool': ['Ctrl', 'w'],
  'close-all-tools': ['Ctrl', 'Shift', 'w'],
  'undo-close-tool': ['Ctrl', 'z'],
  'layout-single': ['Alt', '1'],
  'layout-double': ['Alt', '2'],
  'layout-triple': ['Alt', '3'],
  'show-shortcuts': ['Ctrl', '?'],
};

/** Returns previous default key sequences for migration to current defaults. */
const getPreviousDefaultSequences = (shortcutId: string): KeyCombo[][] => {
  const switchTabMatch = /^switch-tab-(\d+)$/.exec(shortcutId);
  if (switchTabMatch) {
    const tabNumber = switchTabMatch[1];
    return [[[primaryModifier, tabNumber]], [['Ctrl', tabNumber]], [['Meta', tabNumber]], [['Mod', tabNumber]]];
  }

  if (shortcutId === 'close-current-tool') {
    return [[[primaryModifier, 'w']], [['Ctrl', 'w']], [['Meta', 'w']], [['Mod', 'w']]];
  }

  return [];
};

/** Returns true when a stored combo uses an old default primary modifier. */
const matchesDefaultPrimaryCombo = (combo: KeyCombo, fallbackCombo: KeyCombo) => {
  const oldPrimaryCombos = [
    fallbackCombo,
    fallbackCombo.map(key => key === primaryModifier ? 'Ctrl' : key),
    fallbackCombo.map(key => key === primaryModifier ? 'Meta' : key),
    fallbackCombo.map(key => key === primaryModifier ? 'Mod' : key),
  ];

  return oldPrimaryCombos.some(defaultCombo => combosEqual(combo, defaultCombo));
};

/** Returns true when stored keys still match a previous default sequence. */
const shouldUseCurrentDefault = (keys: KeyCombo[], fallback: Shortcut) => {
  const defaultSequences = [fallback.defaultKeys, ...getPreviousDefaultSequences(fallback.id)];
  return defaultSequences.some(sequence => (
    keys.length === sequence.length &&
    keys.every((combo, index) => matchesDefaultPrimaryCombo(combo, sequence[index]))
  ));
};

/** Returns a stored shortcut upgraded to the current shortcut shape. */
const normalizeStoredShortcut = (shortcut: Partial<Shortcut> & { keys?: string[] | KeyCombo[] }, fallback?: Shortcut) => {
  const legacyKeys = Array.isArray(shortcut.keys) && typeof shortcut.keys[0] === 'string'
    ? shortcut.keys as string[]
    : undefined;
  const storedKeys = Array.isArray(shortcut.keys) && Array.isArray(shortcut.keys[0])
    ? shortcut.keys as KeyCombo[]
    : undefined;
  const legacyDefault = fallback ? legacyDefaultKeysById[fallback.id] : undefined;
  const keys = storedKeys || (legacyKeys ? [legacyKeys] : fallback?.keys || []);
  const shouldUseNewDefault = !!fallback && !!legacyDefault && keys.length === 1 && combosEqual(keys[0], legacyDefault);

  return {
    id: shortcut.id || fallback?.id || '',
    name: fallback?.name || shortcut.name || '',
    description: fallback?.description || shortcut.description || '',
    category: fallback?.category || shortcut.category || 'General',
    mode: shortcut.mode || fallback?.mode || 'standard',
    defaultKeys: fallback?.defaultKeys || [],
    keys: fallback && (shouldUseNewDefault || shouldUseCurrentDefault(keys, fallback)) ? fallback.keys : keys,
    enabled: shortcut.enabled ?? fallback?.enabled ?? true,
  };
};

/** Returns true for old generated tool-slot shortcuts that should be discarded. */
const isLegacyToolSlotShortcut = (shortcut: Shortcut) => {
  const isLegacyId = shortcut.id.startsWith('tool-slot-') || shortcut.id.startsWith('switch-to-tool-') || shortcut.id.startsWith('switch_tool_');
  const isLegacyCategory = shortcut.category === 'Tool Switching' && shortcut.id !== 'tool-hotkeys';
  return isLegacyId || isLegacyCategory;
};

/** Runs a registered shortcut action by id. */
const runActionById = (
  shortcutId: string,
  actionsRef: React.MutableRefObject<Map<string, () => void>>,
  toolHotkeyActionsRef: React.MutableRefObject<Map<string, () => void>>
) => {
  if (shortcutId.startsWith('tool-hotkey:')) {
    const action = toolHotkeyActionsRef.current.get(shortcutId.replace('tool-hotkey:', ''));
    if (action) action();
    return;
  }

  const action = actionsRef.current.get(shortcutId);
  if (action) action();
};

/** Builds the shortcut config mirrored to Electron for webview-focused input. */
const buildIpcConfig = (shortcuts: Shortcut[], toolHotkeys: ToolHotkey[]): ShortcutIpcConfig[] => {
  const shortcutConfigs = shortcuts
    .filter(shortcut => shortcut.enabled && shortcut.keys.length > 0)
    .map(shortcut => ({
      id: shortcut.id,
      name: shortcut.name,
      mode: shortcut.mode,
      keys: shortcut.keys,
    }));

  const toolHotkeyConfigs = toolHotkeys
    .filter(mapping => mapping.enabled && mapping.keys.length > 0)
    .map(mapping => ({
      id: `tool-hotkey:${mapping.id}`,
      name: 'Tool Hotkey',
      mode: 'standard' as ShortcutMode,
      keys: [mapping.keys],
    }));

  return [...shortcutConfigs, ...toolHotkeyConfigs];
};

export const ShortcutsProvider = ({ children }: { children: React.ReactNode }) => {
  const [shortcuts, setShortcuts] = useLocalStorage<Shortcut[]>('keyboard-shortcuts', []);
  const [toolHotkeys, setToolHotkeys] = useLocalStorage<ToolHotkey[]>('tool-hotkeys-list', []);
  const actionsRef = useRef<Map<string, () => void>>(new Map());
  const toolHotkeyActionsRef = useRef<Map<string, () => void>>(new Map());
  const activePrefixRef = useRef<ActivePrefix | null>(null);
  const prefixTimerRef = useRef<number | null>(null);
  const recordingRef = useRef(false);

  useEffect(() => {
    const normalized = shortcuts
      .map(shortcut => normalizeStoredShortcut(shortcut, defaultShortcuts.find(item => item.id === shortcut.id)))
      .filter(shortcut => shortcut.id && !isLegacyToolSlotShortcut(shortcut));
    const missingDefaults = defaultShortcuts.filter(defaultShortcut => !normalized.some(shortcut => shortcut.id === defaultShortcut.id));
    const nextShortcuts = [...normalized, ...missingDefaults];

    if (JSON.stringify(nextShortcuts) !== JSON.stringify(shortcuts)) {
      setShortcuts(nextShortcuts);
    }
  }, [shortcuts, setShortcuts]);

  useEffect(() => {
    window.electronAPI?.setShortcutConfig?.(buildIpcConfig(shortcuts, toolHotkeys));
  }, [shortcuts, toolHotkeys]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onShortcut?.((payload) => {
      const shortcutPayload = payload as ShortcutIpcPayload;
      if (shortcutPayload.type === 'action' && shortcutPayload.shortcutId) {
        runActionById(shortcutPayload.shortcutId, actionsRef, toolHotkeyActionsRef);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    /** Clears the active prefix shortcut state. */
    const clearPrefix = () => {
      activePrefixRef.current = null;
      if (prefixTimerRef.current) {
        window.clearTimeout(prefixTimerRef.current);
        prefixTimerRef.current = null;
      }
    };

    /** Starts waiting for the next key in a prefix shortcut sequence. */
    const activatePrefix = (prefixShortcuts: Shortcut[]) => {
      activePrefixRef.current = { shortcuts: prefixShortcuts, nextStep: 1 };
      if (prefixTimerRef.current) window.clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = window.setTimeout(clearPrefix, 2000);
    };

    /** Handles app-level shortcut keys while the renderer chrome has focus. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }
      if (recordingRef.current) return;

      const activePrefix = activePrefixRef.current;
      if (activePrefix) {
        if (event.key === 'Escape') {
          event.preventDefault();
          clearPrefix();
          return;
        }

        const matchingShortcuts = activePrefix.shortcuts.filter(shortcut => {
          const expectedCombo = shortcut.keys[activePrefix.nextStep];
          return expectedCombo && comboMatchesKeyboardEvent(expectedCombo, event, true);
        });

        if (matchingShortcuts.length > 0) {
          event.preventDefault();
          const nextStep = activePrefix.nextStep + 1;
          const completedShortcut = matchingShortcuts.find(shortcut => nextStep >= shortcut.keys.length);
          if (completedShortcut) {
            clearPrefix();
            runActionById(completedShortcut.id, actionsRef, toolHotkeyActionsRef);
          } else {
            activePrefixRef.current = { shortcuts: matchingShortcuts, nextStep };
          }
          return;
        }

        clearPrefix();
      }

      const prefixShortcuts = shortcuts.filter(shortcut =>
        shortcut.enabled &&
        shortcut.mode === 'prefix' &&
        shortcut.keys.length > 0 &&
        comboMatchesKeyboardEvent(shortcut.keys[0], event)
      );

      if (prefixShortcuts.length > 0) {
        event.preventDefault();
        const completedShortcut = prefixShortcuts.find(shortcut => shortcut.keys.length === 1);
        if (completedShortcut) {
          runActionById(completedShortcut.id, actionsRef, toolHotkeyActionsRef);
        } else {
          activatePrefix(prefixShortcuts.filter(shortcut => shortcut.keys.length > 1));
        }
        return;
      }

      const standardShortcut = shortcuts.find(shortcut =>
        shortcut.enabled &&
        shortcut.mode === 'standard' &&
        shortcut.keys.length === 1 &&
        comboMatchesKeyboardEvent(shortcut.keys[0], event)
      );

      if (standardShortcut) {
        event.preventDefault();
        runActionById(standardShortcut.id, actionsRef, toolHotkeyActionsRef);
        return;
      }

      const mapping = toolHotkeys.find(item => item.enabled && comboMatchesKeyboardEvent(item.keys, event));
      if (mapping) {
        event.preventDefault();
        runActionById(`tool-hotkey:${mapping.id}`, actionsRef, toolHotkeyActionsRef);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearPrefix();
    };
  }, [shortcuts, toolHotkeys]);

  /** Suspends or resumes shortcut dispatch while recording a shortcut. */
  const setShortcutRecording = (isRecording: boolean) => {
    recordingRef.current = isRecording;
    window.electronAPI?.setShortcutRecordingActive?.(isRecording);
  };

  /** Registers a callable action for a shortcut id. */
  const registerAction = (shortcutId: string, action: () => void) => {
    actionsRef.current.set(shortcutId, action);
  };

  /** Registers a callable action for a custom tool hotkey id. */
  const registerToolHotkeyAction = (id: string, action: () => void) => {
    toolHotkeyActionsRef.current.set(id, action);
  };

  /** Adds a custom tool hotkey mapping. */
  const addToolHotkey = (mapping: ToolHotkey) => setToolHotkeys(prev => [...prev, mapping]);

  /** Updates a custom tool hotkey mapping. */
  const updateToolHotkey = (id: string, mapping: Partial<ToolHotkey>) => setToolHotkeys(prev => prev.map(item => item.id === id ? { ...item, ...mapping } : item));

  /** Removes a custom tool hotkey mapping. */
  const removeToolHotkey = (id: string) => setToolHotkeys(prev => prev.filter(item => item.id !== id));

  /** Updates the stored key sequence and mode for a shortcut. */
  const updateShortcut = (id: string, keys: KeyCombo[], mode?: ShortcutMode) => {
    setShortcuts(prev =>
      prev.map(shortcut =>
        shortcut.id === id ? { ...shortcut, keys, mode: mode || shortcut.mode } : shortcut
      )
    );
  };

  /** Toggles a shortcut on or off. */
  const toggleShortcut = (id: string) => {
    setShortcuts(prev =>
      prev.map(shortcut =>
        shortcut.id === id ? { ...shortcut, enabled: !shortcut.enabled } : shortcut
      )
    );
  };

  /** Restores one shortcut to its default key sequence and mode. */
  const resetShortcut = (id: string) => {
    const defaultShortcut = defaultShortcuts.find(shortcut => shortcut.id === id);
    if (defaultShortcut) {
      updateShortcut(id, defaultShortcut.defaultKeys, defaultShortcut.mode);
    }
  };

  /** Restores all shortcuts to their default key sequences and modes. */
  const resetAllShortcuts = () => {
    setShortcuts(defaultShortcuts);
  };

  /** Applies a named shortcut preset to all shortcuts. */
  const applyShortcutPreset = (preset: ShortcutPreset) => {
    setShortcuts(buildShortcutPreset(preset));
  };

  /** Finds an enabled shortcut by key sequence. */
  const getShortcutByKeys = (keys: KeyCombo[]): Shortcut | undefined => {
    return shortcuts.find(shortcut =>
      shortcut.enabled &&
      shortcutSequencesEqual(shortcut.keys, keys)
    );
  };

  const contextValue: ShortcutsContextType = {
    shortcuts,
    setShortcutRecording,
    updateShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
    applyShortcutPreset,
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

/** Returns the current keyboard shortcut context. */
export const useShortcuts = () => {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return context;
};
