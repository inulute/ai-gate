// src/components/settings/ShortcutEditor.tsx
import { useState, useEffect } from 'react';
import { useShortcuts, type KeyCombo, type ShortcutMode } from '@/context/ShortcutsContext';
import { useAITools } from '@/context/AIToolsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RotateCcw, Keyboard } from 'lucide-react';
import {
  combosEqual,
  comboFromKeyboardEvent,
  formatShortcutCombo,
  getShortcutDisplayDescription,
  getShortcutDisplayName,
  isUnsupportedShiftedSymbolEvent,
} from '@/lib/shortcutUtils';

interface ShortcutEditorProps {
  shortcutId: string;
  onClose: () => void;
}

/** Renders badges for one shortcut combo. */
const formatCombo = (combo: KeyCombo) => {
  return formatShortcutCombo(combo).map(key => (
    <Badge key={key} variant="secondary" className="text-xs">
      {key}
    </Badge>
  ));
};

/** Renders one or more shortcut combo steps. */
const formatSequence = (sequence: KeyCombo[]) => {
  if (sequence.length === 0) {
    return <span className="text-xs text-muted-foreground">Not assigned</span>;
  }

  return sequence.map((combo, index) => (
    <div key={`${combo.join('-')}-${index}`} className="flex items-center gap-1">
      {index > 0 && <span className="text-xs text-muted-foreground px-1">then</span>}
      {formatCombo(combo)}
    </div>
  ));
};

/** Returns true when the first sequence is a prefix of the second sequence. */
const isSequencePrefix = (first: KeyCombo[], second: KeyCombo[]) => {
  if (first.length > second.length) return false;
  return first.every((combo, index) => combosEqual(combo, second[index]));
};

/** Returns true when two shortcut sequences would be ambiguous at runtime. */
const shortcutSequencesConflict = (first: KeyCombo[], second: KeyCombo[]) => {
  if (first.length === 0 || second.length === 0) return false;
  return isSequencePrefix(first, second) || isSequencePrefix(second, first);
};

export const ShortcutEditor = ({ shortcutId, onClose }: ShortcutEditorProps) => {
  const { shortcuts, updateShortcut, toggleShortcut, resetShortcut, toolHotkeys, addToolHotkey, updateToolHotkey, removeToolHotkey, setShortcutRecording } = useShortcuts();
  const { tools } = useAITools();
  const shortcut = shortcuts.find(item => item.id === shortcutId);
  const shortcutMode = shortcut?.mode;
  const [isListening, setIsListening] = useState(false);
  const [newSequence, setNewSequence] = useState<KeyCombo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | undefined>(undefined);
  const [recordingMode, setRecordingMode] = useState<ShortcutMode>('standard');

  /** Returns a validation message when a shortcut sequence cannot be saved. */
  const getShortcutError = (sequence: KeyCombo[]) => {
    if (sequence.length === 0) {
      return 'Please press a valid key combination';
    }

    const conflictingShortcut = shortcuts.find(item =>
      item.id !== shortcutId &&
      item.enabled &&
      shortcutSequencesConflict(item.keys, sequence)
    );

    if (conflictingShortcut) {
      return `This shortcut conflicts with "${conflictingShortcut.name}"`;
    }

    const conflictingToolHotkey = toolHotkeys.find(mapping =>
      mapping.enabled &&
      shortcutSequencesConflict([mapping.keys], sequence)
    );

    if (conflictingToolHotkey) {
      return 'This shortcut conflicts with a tool hotkey';
    }

    return null;
  };

  /** Stops recording and validates the current shortcut sequence. */
  const stopRecording = () => {
    const validationError = getShortcutError(newSequence);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsListening(false);
  };

  /** Returns a validation message when a tool hotkey cannot be added. */
  const getToolHotkeyError = (combo: KeyCombo) => {
    if (combo.length === 0) {
      setError('Please press a valid key combination');
      return 'Please press a valid key combination';
    }

    const conflictingShortcut = shortcuts.find(item =>
      item.enabled &&
      shortcutSequencesConflict(item.keys, [combo])
    );

    if (conflictingShortcut) {
      return `This hotkey conflicts with "${conflictingShortcut.name}"`;
    }

    const conflictingToolHotkey = toolHotkeys.find(mapping =>
      mapping.enabled &&
      combosEqual(mapping.keys, combo)
    );

    if (conflictingToolHotkey) {
      return 'This hotkey conflicts with another tool hotkey';
    }

    return null;
  };

  useEffect(() => {
    if (shortcutMode) setRecordingMode(shortcutMode);
  }, [shortcutMode]);

  useEffect(() => {
    setShortcutRecording(isListening);
    return () => setShortcutRecording(false);
  }, [isListening, setShortcutRecording]);

  useEffect(() => {
    if (!isListening) return;

    /** Records each completed key combo into the pending shortcut sequence. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      event.preventDefault();
      event.stopPropagation();
      setError(null);

      if (isUnsupportedShiftedSymbolEvent(event)) {
        setError('Shifted number and punctuation shortcuts are not supported in webviews');
        return;
      }

      const combo = comboFromKeyboardEvent(event);
      if (combo.length === 0 || combo.every(key => ['Ctrl', 'Meta', 'Alt', 'Shift'].includes(key))) return;

      setNewSequence(prev => {
        const nextSequence = recordingMode === 'standard' ? [combo] : [...prev, combo];
        if (recordingMode === 'standard') {
          window.setTimeout(() => setIsListening(false), 0);
        }
        return nextSequence;
      });
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isListening, recordingMode]);

  if (!shortcut) return null;

  const isToolHotkeysManager = shortcut.id === 'tool-hotkeys';

  /** Starts recording a new shortcut sequence. */
  const handleStartRecording = () => {
    setNewSequence([]);
    setError(null);
    setIsListening(true);
  };

  /** Saves the pending shortcut sequence. */
  const handleSave = () => {
    const validationError = getShortcutError(newSequence);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateShortcut(shortcutId, newSequence, recordingMode);
    onClose();
  };

  /** Clears the saved shortcut assignment. */
  const handleClearSavedShortcut = () => {
    updateShortcut(shortcutId, [], recordingMode);
    setNewSequence([]);
    setError(null);
  };

  /** Resets the shortcut to its default sequence. */
  const handleReset = () => {
    resetShortcut(shortcutId);
    setRecordingMode(shortcut.mode);
    setNewSequence([]);
    setError(null);
  };

  /** Adds a standard tool hotkey mapping from the recorded combo. */
  const handleAddToolHotkey = () => {
    if (!selectedToolId || newSequence.length === 0) return;
    const validationError = getToolHotkeyError(newSequence[0]);
    if (validationError) {
      setError(validationError);
      return;
    }

    addToolHotkey({ id: `${Date.now()}`, keys: newSequence[0], toolId: selectedToolId, enabled: true });
    setNewSequence([]);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">{getShortcutDisplayName(shortcut, tools)}</h3>
          <p className="text-sm text-muted-foreground">{getShortcutDisplayDescription(shortcut, tools)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={shortcut.enabled}
            onCheckedChange={() => toggleShortcut(shortcutId)}
          />
          <Label className="text-sm">Enabled</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Current Shortcut</Label>
        <div className="flex flex-wrap items-center gap-2">
          {formatSequence(shortcut.keys)}
        </div>

        {isToolHotkeysManager && (
          <div className="space-y-3">
            <Label>Tool Hotkey Mappings</Label>
            <div className="space-y-2">
              {toolHotkeys.length === 0 && (
                <div className="text-sm text-muted-foreground">No mappings yet. Add one below.</div>
              )}
              {toolHotkeys.map(mapping => (
                <div key={mapping.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <div className="flex gap-1">
                    {formatCombo(mapping.keys)}
                  </div>
                  <div className="ml-2 flex-1">
                    <Select value={mapping.toolId} onValueChange={(val) => updateToolHotkey(mapping.id, { toolId: val })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tools.map(tool => (
                          <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Switch checked={mapping.enabled} onCheckedChange={(enabled) => updateToolHotkey(mapping.id, { enabled })} />
                  <Button variant="ghost" size="sm" onClick={() => removeToolHotkey(mapping.id)}>Remove</Button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Add New Mapping</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {tools.map(tool => (
                        <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={handleStartRecording} className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" /> Record
                </Button>
                <Button
                  onClick={handleAddToolHotkey}
                  disabled={!selectedToolId || newSequence.length === 0}
                >
                  Add
                </Button>
              </div>
              {newSequence.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Recorded:</span>
                  {formatCombo(newSequence[0])}
                  <Button variant="ghost" size="sm" onClick={() => setNewSequence([])} className="ml-auto">Clear</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {!isToolHotkeysManager && (
          <div className="space-y-2">
            <Label>Shortcut Style</Label>
            <RadioGroup
              value={recordingMode}
              onValueChange={(value) => {
                setRecordingMode(value as ShortcutMode);
                setNewSequence([]);
                setError(null);
              }}
              className="grid grid-cols-2 gap-2"
            >
              <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <RadioGroupItem value="standard" id="shortcut-standard" />
                Standard
              </label>
              <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <RadioGroupItem value="prefix" id="shortcut-prefix" />
                Prefix
              </label>
            </RadioGroup>
          </div>
        )}

        <div className="space-y-2">
          <Label>New Shortcut</Label>
          <div className="space-y-3">
            {!isListening ? (
              <Button
                variant="outline"
                onClick={handleStartRecording}
                className="flex items-center gap-2 w-full"
              >
                <Keyboard className="h-4 w-4" />
                Record New Shortcut
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center p-4 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                  <div className="text-center">
                    <div className="animate-pulse text-primary font-medium">
                      {recordingMode === 'prefix' ? 'Press each step, then click Done' : 'Press any key combination'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {recordingMode === 'prefix' ? 'Prefix shortcuts can contain multiple key combos' : 'Recording stops after one combo'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {recordingMode === 'prefix' && (
                    <Button
                      variant="outline"
                      onClick={stopRecording}
                      className="flex-1"
                    >
                      Done
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setIsListening(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {newSequence.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recorded Shortcut:</Label>
                <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-md">
                  {formatSequence(newSequence)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewSequence([])}
                    className="ml-auto"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div data-testid="shortcut-recorder-error" className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </div>

        {!isToolHotkeysManager && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSavedShortcut}
            >
              Clear Shortcut
            </Button>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isToolHotkeysManager && newSequence.length === 0}
          className="min-w-[100px]"
        >
          {newSequence.length > 0 ? 'Save Changes' : 'No Changes'}
        </Button>
      </div>
    </div>
  );
};
