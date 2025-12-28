// src/components/workspace/ToolPicker.tsx
import { AITool } from '@/types/AITool';
import { useAITools } from '@/context/AIToolsContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus } from 'lucide-react';

interface ToolPickerProps {
  panelId: number;
}

export const ToolPicker = ({ panelId }: ToolPickerProps) => {
  const { tools, createInstanceInPanel } = useAITools();

  const handleSelectTool = (tool: AITool) => {
    createInstanceInPanel(tool, panelId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex-shrink-0 p-2 hover:bg-secondary/50 transition-colors border-l border-border"
          title="Add new tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tools.length === 0 ? (
          <DropdownMenuItem disabled>No tools available</DropdownMenuItem>
        ) : (
          <>
            {tools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                onClick={() => handleSelectTool(tool)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <img
                  src={tool.icon}
                  alt={tool.name}
                  className="w-4 h-4"
                />
                <span>{tool.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
