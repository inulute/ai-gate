// src/components/ui/keyboard-shortcuts.tsx
import { useState, useEffect } from 'react';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useAITools } from '@/context/AIToolsContext';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Keyboard, X } from 'lucide-react';
import { formatShortcutCombo, getShortcutDisplayDescription, shouldShowShortcut } from '@/lib/shortcutUtils';

export const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { shortcuts, registerAction } = useShortcuts();
  const { tools } = useAITools();

  // Register the show-shortcuts action
  useEffect(() => {
    registerAction('show-shortcuts', () => {
      console.log('Show shortcuts action triggered');
      setIsOpen(true);
    });
  }, [registerAction]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const groupedShortcuts = shortcuts.filter(shortcut => shouldShowShortcut(shortcut, tools)).reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                        {categoryShortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 ${
                              !shortcut.enabled ? 'opacity-50' : ''
                            }`}
                          >
                            <span className="text-sm">{getShortcutDisplayDescription(shortcut, tools)}</span>
                            <div className="flex flex-wrap justify-end gap-1">
                              {shortcut.keys.length === 0 && (
                                <span className="text-xs text-muted-foreground">Not assigned</span>
                              )}
                              {shortcut.keys.map((combo, comboIndex) => (
                                <div key={comboIndex} className="flex items-center gap-1">
                                  {comboIndex > 0 && (
                                    <span className="text-muted-foreground text-xs">then</span>
                                  )}
                                  {formatShortcutCombo(combo).map((key) => (
                                    <Badge
                                      key={`${comboIndex}-${key}`}
                                      variant={shortcut.enabled ? "secondary" : "outline"}
                                      className="text-xs"
                                    >
                                      {key}
                                    </Badge>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
