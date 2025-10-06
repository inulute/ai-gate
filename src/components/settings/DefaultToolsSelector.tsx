// src/components/settings/DefaultToolsSelector.tsx
import { useState, useEffect, useRef } from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultToolsSelectorProps {
  layout: string;
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
}

export const DefaultToolsSelector = ({ layout, selectedTools, onToolsChange }: DefaultToolsSelectorProps) => {
  const { tools } = useAITools();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const layoutNumber = parseInt(layout);
  const maxTools = layoutNumber;

  useEffect(() => {
    if (selectedTools.length > maxTools) {
      const trimmedTools = selectedTools.slice(0, maxTools);
      onToolsChange(trimmedTools);
    }
  }, [layout, selectedTools, maxTools, onToolsChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToolToggle = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter(id => id !== toolId));
    } else {
      if (selectedTools.length < maxTools) {
        onToolsChange([...selectedTools, toolId]);
      }
    }
  };

  const handleReset = () => {
    const defaultTools = ['chatgpt', 'gemini'].slice(0, maxTools);
    onToolsChange(defaultTools);
  };

  const isToolSelected = (toolId: string) => selectedTools.includes(toolId);
  const canAddMore = selectedTools.length < maxTools;

  const availableTools = tools.filter(tool => !isToolSelected(tool.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Default Tools</h4>
          <p className="text-xs text-muted-foreground">
            Select up to {maxTools} tool{maxTools > 1 ? 's' : ''} to open by default
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Selected Tools Display */}
      {selectedTools.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Selected tools:</p>
          <div className="grid grid-cols-2 gap-2">
            {selectedTools.map((toolId) => {
              const tool = tools.find(t => t.id === toolId);
              return (
                <div
                  key={toolId}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-primary/10 border-primary text-primary"
                >
                  <img
                    src={tool?.icon}
                    alt={tool?.name}
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium truncate flex-1">{tool?.name || toolId}</span>
                  <button
                    onClick={() => handleToolToggle(toolId)}
                    className="hover:bg-destructive/20 rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Tool Dropdown */}
      {canAddMore && (
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full justify-between text-sm"
            disabled={availableTools.length === 0}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Tool ({availableTools.length} available)
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              isDropdownOpen && "rotate-180"
            )} />
          </Button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
              <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {availableTools.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No more tools available
                  </div>
                ) : (
                  availableTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        handleToolToggle(tool.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left transition-colors"
                    >
                      <img
                        src={tool.icon}
                        alt={tool.name}
                        className="w-4 h-4 rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-sm font-medium truncate">{tool.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};