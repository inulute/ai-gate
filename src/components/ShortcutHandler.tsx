// src/components/ShortcutHandler.tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useShortcutActions } from '@/hooks/useShortcutActions';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useAITools } from '@/context/AIToolsContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export const ShortcutHandler = () => {
  useShortcutActions();

  const { registerAction } = useShortcuts();
  const { layout, activePanelId, getActivePanelInstance, renameInstance } = useAITools();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameInstanceId, setRenameInstanceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAction('rename-current-tab', () => {
      const visibleActivePanelId = activePanelId < parseInt(layout) ? activePanelId : 0;
      const activeInstance = getActivePanelInstance(visibleActivePanelId);
      if (!activeInstance) return;

      setRenameInstanceId(activeInstance.id);
      setRenameValue(activeInstance.customTitle || activeInstance.title);
      setIsRenameOpen(true);
    });
  }, [registerAction, getActivePanelInstance, layout, activePanelId]);

  useEffect(() => {
    if (!isRenameOpen) return;
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isRenameOpen]);

  /** Saves the current rename value to the active tab. */
  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (renameInstanceId) {
      renameInstance(renameInstanceId, renameValue);
    }
    setIsRenameOpen(false);
    setRenameInstanceId(null);
  };

  return (
    <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
      <DialogContent data-testid="rename-tab-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Tab</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleRenameSubmit}>
          <Input
            ref={inputRef}
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
