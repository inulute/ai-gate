// src/components/settings/ShortcutEditor.tsx
import { useState, useEffect } from 'react';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useAITools } from '@/context/AIToolsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, Keyboard } from 'lucide-react';

interface ShortcutEditorProps {
  shortcutId: string;
  onClose: () => void;
}

export const ShortcutEditor = ({ shortcutId, onClose }: ShortcutEditorProps) => {
  const { shortcuts, updateShortcut, toggleShortcut, resetShortcut, toolHotkeys, addToolHotkey, updateToolHotkey, removeToolHotkey } = useShortcuts();
  const { tools } = useAITools();
  const [isListening, setIsListening] = useState(false);
  const [newKeys, setNewKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [selectedToolId, setSelectedToolId] = useState<string | undefined>(undefined);

  const shortcut = shortcuts.find(s => s.id === shortcutId);
  if (!shortcut) return null;

  const isToolHotkeysManager = shortcut.id === 'tool-hotkeys';

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isListening) return;

    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const key = e.key;
    setPressedKeys(prev => new Set([...prev, key]));

    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');
    
    if (key && key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
      keys.push(key);
    }

    // Update the displayed keys in real-time
    if (keys.length > 0) {
      setNewKeys(keys);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isListening) return;

    e.preventDefault();
    e.stopPropagation();

    // Remove the key from pressed keys
    const key = e.key;
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      
      if (newSet.size === 0) {
        setTimeout(() => {
          const finalKeys = newKeys;
          
          // Don't allow empty shortcuts
          if (finalKeys.length === 0) {
            setError('Please press a valid key combination');
            return;
          }

          const conflictingShortcut = shortcuts.find(s => 
            s.id !== shortcutId && 
            s.enabled && 
            s.keys.length === finalKeys.length &&
            s.keys.every((key, index) => key.toLowerCase() === finalKeys[index]?.toLowerCase())
          );

          if (conflictingShortcut) {
            setError(`This shortcut conflicts with "${conflictingShortcut.name}"`);
            return;
          }

          setIsListening(false);
        }, 100);       }
      
      return newSet;
    });
  };

  useEffect(() => {
    if (isListening) {
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('keyup', handleKeyUp, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('keyup', handleKeyUp, true);
      };
    }
  }, [isListening, newKeys, pressedKeys]);

  const handleStartRecording = () => {
    setNewKeys([]);
    setError(null);
    setPressedKeys(new Set());
    setIsListening(true);
  };

  const handleStopRecording = () => {
    setIsListening(false);
  };

  const handleSave = () => {
    if (newKeys.length > 0) {
      updateShortcut(shortcutId, newKeys);
    }
    onClose();
  };

  const handleReset = () => {
    resetShortcut(shortcutId);
    setNewKeys([]);
    setError(null);
    setPressedKeys(new Set());
  };

  const formatKeys = (keys: string[]) => {
    return keys.map(key => (
      <Badge key={key} variant="secondary" className="text-xs">
        {key}
      </Badge>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{shortcut.name}</h3>
          <p className="text-sm text-muted-foreground">{shortcut.description}</p>
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
        <div className="flex items-center gap-2">
          {formatKeys(shortcut.keys)}
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
                    {mapping.keys.map(k => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                  <div className="ml-2 flex-1">
                    <Select value={mapping.toolId} onValueChange={(val) => updateToolHotkey(mapping.id, { toolId: val })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tools.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Switch checked={mapping.enabled} onCheckedChange={(v) => updateToolHotkey(mapping.id, { enabled: v })} />
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
                      {tools.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={handleStartRecording} className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" /> Record Keys
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedToolId || newKeys.length === 0) return;
                    addToolHotkey({ id: `${Date.now()}`, keys: newKeys, toolId: selectedToolId, enabled: true });
                    setNewKeys([]);
                  }}
                  disabled={!selectedToolId || newKeys.length === 0}
                >
                  Add
                </Button>
              </div>
              {newKeys.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Recorded:</span>
                  {formatKeys(newKeys)}
                  <Button variant="ghost" size="sm" onClick={() => setNewKeys([])} className="ml-auto">Clear</Button>
                </div>
              )}
            </div>
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
                Click to Record New Shortcut
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center p-4 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                  <div className="text-center">
                    <div className="animate-pulse text-primary font-medium">
                      Press any key combination...
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      The recording will stop automatically
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleStopRecording}
                  className="w-full"
                >
                  Cancel Recording
                </Button>
              </div>
            )}
            
            {newKeys.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recorded Shortcut:</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  {formatKeys(newKeys)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewKeys([])}
                    className="ml-auto"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </div>

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
        </div>
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={newKeys.length === 0}
          className="min-w-[100px]"
        >
          {newKeys.length > 0 ? 'Save Changes' : 'No Changes'}
        </Button>
      </div>
    </div>
  );
};
