import type { KeyCombo, Shortcut, ShortcutMode } from '@/context/ShortcutsContext';
import type { AITool } from '@/types/AITool';

const modifierLabels = new Map([
  ['control', 'Ctrl'],
  ['ctrl', 'Ctrl'],
  ['command', 'Meta'],
  ['cmd', 'Meta'],
  ['meta', 'Meta'],
  ['option', 'Alt'],
  ['alt', 'Alt'],
  ['shift', 'Shift'],
  ['mod', 'Mod'],
]);

const codeKeyLabels = new Map([
  ['Backquote', '`'],
  ['Minus', '-'],
  ['Equal', '='],
  ['NumpadAdd', '+'],
  ['NumpadSubtract', '-'],
  ['NumpadEqual', '='],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
  ['Backslash', '\\'],
  ['Semicolon', ';'],
  ['Quote', "'"],
  ['Comma', ','],
  ['Period', '.'],
  ['Slash', '/'],
  ['Space', 'Space'],
]);

// Keep renderer and Electron main-process shortcut matching logic paired.
// electron/main.ts has a local copy so webview key events can be intercepted before they reach the page.

/** Normalizes keyboard names into the labels stored in shortcut settings. */
export const normalizeKeyToken = (key: string) => {
  const modifier = modifierLabels.get(key.toLowerCase());
  if (modifier) return modifier;
  if (key === ' ') return 'Space';
  if (key === 'Esc') return 'Escape';
  return key.length === 1 ? key.toLowerCase() : key;
};

/** Returns the unshifted physical key label for printable keyboard events. */
export const keyTokenFromKeyboardEvent = (event: KeyboardEvent) => {
  if (/^Digit[0-9]$/.test(event.code)) return event.code.replace('Digit', '');
  if (/^Numpad[0-9]$/.test(event.code)) return event.code.replace('Numpad', '');
  if (/^Key[A-Z]$/.test(event.code)) return event.code.replace('Key', '').toLowerCase();

  return normalizeKeyToken(codeKeyLabels.get(event.code) || event.key);
};

/** Returns true for shifted printable punctuation or number keys we cannot reliably match in webviews. */
export const isUnsupportedShiftedSymbolEvent = (event: KeyboardEvent) => {
  return event.shiftKey && (/^Digit[0-9]$/.test(event.code) || (codeKeyLabels.has(event.code) && event.code !== 'Space'));
};

/** Returns true when the key token is a shortcut modifier label. */
export const isModifierKey = (key: string) => {
  return ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'].includes(normalizeKeyToken(key));
};

/** Returns the default primary shortcut modifier for this platform. */
export const getDefaultShortcutModifier = (): 'Ctrl' | 'Meta' => {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? 'Meta' : 'Ctrl';
};

/** Converts a keyboard event into a normalized shortcut combo. */
export const comboFromKeyboardEvent = (event: KeyboardEvent): KeyCombo => {
  const keys: KeyCombo = [];
  if (event.ctrlKey) keys.push('Ctrl');
  if (event.metaKey) keys.push('Meta');
  if (event.altKey) keys.push('Alt');
  if (event.shiftKey) keys.push('Shift');

  const key = keyTokenFromKeyboardEvent(event);
  if (!isModifierKey(key)) keys.push(key);

  return keys;
};

/** Returns the browser zoom shortcut id for a keyboard event, if any. */
export const getBrowserZoomShortcutIdFromKeyboardEvent = (event: KeyboardEvent) => {
  const key = keyTokenFromKeyboardEvent(event);
  const isPrimary = (event.ctrlKey || event.metaKey) && !event.altKey;
  if (!isPrimary) return null;
  if (key === '=' || key === '+') return 'browser-zoom-in';
  if (!event.shiftKey && key === '-') return 'browser-zoom-out';
  if (!event.shiftKey && key === '0') return 'browser-zoom-reset';
  return null;
};

/** Checks whether a keyboard event matches a stored shortcut combo. */
export const comboMatchesKeyboardEvent = (combo: KeyCombo, event: KeyboardEvent, allowExtraMod = false) => {
  const normalizedCombo = combo.map(normalizeKeyToken);
  const wantsMod = normalizedCombo.includes('Mod');
  const wantsCtrl = normalizedCombo.includes('Ctrl');
  const wantsMeta = normalizedCombo.includes('Meta');
  const wantsAlt = normalizedCombo.includes('Alt');
  const wantsShift = normalizedCombo.includes('Shift');
  const expectedKey = normalizedCombo.find(key => !isModifierKey(key));
  const eventKey = keyTokenFromKeyboardEvent(event);

  if (wantsMod) {
    if (!event.ctrlKey && !event.metaKey) return false;
  } else if (!allowExtraMod) {
    if (event.ctrlKey !== wantsCtrl) return false;
    if (event.metaKey !== wantsMeta) return false;
  } else if (wantsCtrl || wantsMeta) {
    if (event.ctrlKey !== wantsCtrl) return false;
    if (event.metaKey !== wantsMeta) return false;
  }

  if (event.altKey !== wantsAlt) return false;
  if (event.shiftKey !== wantsShift) return false;
  return !!expectedKey && expectedKey.toLowerCase() === eventKey.toLowerCase();
};

/** Returns true when two shortcut combos are equivalent. */
export const combosEqual = (first: KeyCombo, second: KeyCombo) => {
  if (first.length !== second.length) return false;
  return first.every((key, index) => normalizeKeyToken(key).toLowerCase() === normalizeKeyToken(second[index]).toLowerCase());
};

/** Returns true when two shortcut sequences are equivalent. */
export const shortcutSequencesEqual = (first: KeyCombo[], second: KeyCombo[]) => {
  if (first.length !== second.length) return false;
  return first.every((combo, index) => combosEqual(combo, second[index]));
};

/** Formats a shortcut combo for display. */
export const formatShortcutCombo = (combo: KeyCombo) => {
  return combo.map(normalizeKeyToken);
};

export type ShortcutPreset = 'original' | 'iterm' | 'tmux';

/** Creates the original shortcut preset from before configurable tab shortcuts. */
export const buildOriginalShortcuts = (): Shortcut[] => {
  const primaryModifier = getDefaultShortcutModifier();
  const tabShortcuts = Array.from({ length: 9 }, (_, index) => {
    const tabNumber = index + 1;
    return {
      id: `switch-tab-${tabNumber}`,
      name: `Switch to Tab ${tabNumber}`,
      description: `Switch to tab ${tabNumber}`,
      category: 'Tabs',
      mode: 'standard' as ShortcutMode,
      defaultKeys: [],
      keys: [],
      enabled: true,
    };
  });

  const newTabShortcuts = Array.from({ length: 9 }, (_, index) => {
    const toolNumber = index + 1;
    return {
      id: `new-tool-tab-${toolNumber}`,
      name: `New Tool Tab ${toolNumber}`,
      description: `Open tool ${toolNumber} in a new tab`,
      category: 'Tabs',
      mode: 'standard' as ShortcutMode,
      defaultKeys: [],
      keys: [],
      enabled: true,
    };
  });

  return [
    {
      id: 'close-current-tool',
      name: 'Close Current Tab',
      description: 'Close the currently active tab',
      category: 'Tool Management',
      mode: 'standard',
      defaultKeys: [[primaryModifier, 'w']],
      keys: [[primaryModifier, 'w']],
      enabled: true,
    },
    {
      id: 'close-all-tools',
      name: 'Close All Tabs',
      description: 'Close all unpinned tabs',
      category: 'Tool Management',
      mode: 'standard',
      defaultKeys: [[primaryModifier, 'Shift', 'w']],
      keys: [[primaryModifier, 'Shift', 'w']],
      enabled: true,
    },
    {
      id: 'undo-close-tool',
      name: 'Undo Close Tab',
      description: 'Restore the most recently closed tab',
      category: 'Tool Management',
      mode: 'standard',
      defaultKeys: [[primaryModifier, 'z']],
      keys: [[primaryModifier, 'z']],
      enabled: true,
    },
    {
      id: 'layout-single',
      name: 'Single Panel Layout',
      description: 'Switch to single panel layout',
      category: 'Layout',
      mode: 'standard',
      defaultKeys: [['Alt', '1']],
      keys: [['Alt', '1']],
      enabled: true,
    },
    {
      id: 'layout-double',
      name: 'Two Panel Layout',
      description: 'Switch to two panel layout',
      category: 'Layout',
      mode: 'standard',
      defaultKeys: [['Alt', '2']],
      keys: [['Alt', '2']],
      enabled: true,
    },
    {
      id: 'layout-triple',
      name: 'Three Panel Layout',
      description: 'Switch to three panel layout',
      category: 'Layout',
      mode: 'standard',
      defaultKeys: [['Alt', '3']],
      keys: [['Alt', '3']],
      enabled: true,
    },
    {
      id: 'show-shortcuts',
      name: 'Show Shortcuts',
      description: 'Display keyboard shortcuts help',
      category: 'General',
      mode: 'standard',
      defaultKeys: [[primaryModifier, '/']],
      keys: [[primaryModifier, '/']],
      enabled: true,
    },
    {
      id: 'rename-current-tab',
      name: 'Rename Current Tab',
      description: 'Rename the currently active tab',
      category: 'Tool Management',
      mode: 'standard',
      defaultKeys: [],
      keys: [],
      enabled: true,
    },
    ...tabShortcuts,
    ...newTabShortcuts,
    {
      id: 'tool-hotkeys',
      name: 'Tool Hotkeys',
      description: 'Configure custom key combos to focus/open your tools',
      category: 'Tool Switching',
      mode: 'standard',
      defaultKeys: [],
      keys: [],
      enabled: true,
    },
  ];
};

/** Creates the iTerm-style shortcut preset. */
export const buildItermShortcuts = (): Shortcut[] => {
  const primaryModifier = getDefaultShortcutModifier();
  return buildOriginalShortcuts().map(shortcut => {
    const switchTabMatch = /^switch-tab-(\d+)$/.exec(shortcut.id);
    if (switchTabMatch) {
      const tabNumber = switchTabMatch[1];
      return { ...shortcut, mode: 'standard' as ShortcutMode, defaultKeys: [[primaryModifier, tabNumber]], keys: [[primaryModifier, tabNumber]] };
    }

    return shortcut;
  });
};

/** Creates the tmux-style shortcut preset. */
export const buildTmuxShortcuts = (): Shortcut[] => {
  const primaryModifier = getDefaultShortcutModifier();
  return buildOriginalShortcuts().map(shortcut => {
    const switchTabMatch = /^switch-tab-(\d+)$/.exec(shortcut.id);
    if (switchTabMatch) {
      const tabNumber = switchTabMatch[1];
      const keys = [[primaryModifier, 'b'], [tabNumber]];
      return { ...shortcut, mode: 'prefix' as ShortcutMode, defaultKeys: keys, keys };
    }

    const newToolTabMatch = /^new-tool-tab-(\d+)$/.exec(shortcut.id);
    if (newToolTabMatch) {
      const toolNumber = newToolTabMatch[1];
      const keys = [[primaryModifier, 'n'], [toolNumber]];
      return { ...shortcut, mode: 'prefix' as ShortcutMode, defaultKeys: keys, keys };
    }

    if (shortcut.id === 'close-current-tool') {
      return { ...shortcut, mode: 'prefix' as ShortcutMode, defaultKeys: [[primaryModifier, 'b'], ['x']], keys: [[primaryModifier, 'b'], ['x']] };
    }

    if (shortcut.id === 'rename-current-tab') {
      return { ...shortcut, mode: 'prefix' as ShortcutMode, defaultKeys: [[primaryModifier, 'b'], [',']], keys: [[primaryModifier, 'b'], [',']] };
    }

    return shortcut;
  });
};

/** Creates the shortcut list for a named preset. */
export const buildShortcutPreset = (preset: ShortcutPreset) => {
  if (preset === 'tmux') return buildTmuxShortcuts();
  if (preset === 'iterm') return buildItermShortcuts();
  return buildOriginalShortcuts();
};

/** Creates the default shortcut list. */
export const buildDefaultShortcuts = (): Shortcut[] => {
  return buildOriginalShortcuts();
};

/** Returns the zero-based tool index targeted by a new-tool-tab shortcut id. */
export const getNewToolShortcutIndex = (shortcutId: string) => {
  const match = /^new-tool-tab-(\d+)$/.exec(shortcutId);
  if (!match) return null;
  return parseInt(match[1], 10) - 1;
};

/** Returns true when a shortcut should be shown for the current tool list. */
export const shouldShowShortcut = (shortcut: Shortcut, tools: AITool[]) => {
  const toolIndex = getNewToolShortcutIndex(shortcut.id);
  return toolIndex === null || toolIndex < tools.length;
};

/** Returns the user-facing shortcut name for the current tool list. */
export const getShortcutDisplayName = (shortcut: Shortcut, tools: AITool[]) => {
  const toolIndex = getNewToolShortcutIndex(shortcut.id);
  if (toolIndex === null) return shortcut.name;

  const tool = tools[toolIndex];
  return tool ? `Open New ${tool.name} Tab` : shortcut.name;
};

/** Returns the user-facing shortcut description for the current tool list. */
export const getShortcutDisplayDescription = (shortcut: Shortcut, tools: AITool[]) => {
  const toolIndex = getNewToolShortcutIndex(shortcut.id);
  if (toolIndex === null) return shortcut.description;

  const tool = tools[toolIndex];
  return tool ? `Open a new ${tool.name} tab` : shortcut.description;
};
