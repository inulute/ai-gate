// src/components/workspace/Tab.tsx
import { X } from 'lucide-react';
import { ToolInstance, AITool } from '@/types/AITool';
import { useAITools } from '@/context/AIToolsContext';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TabProps {
  instance: ToolInstance;
  tool: AITool;
  isActive: boolean;
  onClose: () => void;
  panelId: number; // The current panel this tab is being displayed in
}

export const Tab = ({ instance, tool, isActive, onClose, panelId }: TabProps) => {
  const { setActivePanelTab, highlightPanel } = useAITools();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.id,
    disabled: false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayTitle = instance.customTitle || instance.title;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent drag from interfering with click
    e.stopPropagation();

    // Check if this instance belongs to the current panel
    if (instance.panelId === panelId) {
      // Instance is in this panel - normal activation
      setActivePanelTab(panelId, instance.id);
    } else {
      // Instance is in a different panel - highlight that panel and focus it there
      setActivePanelTab(instance.panelId, instance.id);
      highlightPanel(instance.panelId);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!instance.isPinned) {
      onClose();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        group relative flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px]
        border-r border-border transition-all
        ${isActive
          ? 'bg-background text-foreground'
          : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
        }
      `}
    >
      {/* Draggable area (icon + title) */}
      <div
        {...listeners}
        onClick={handleClick}
        className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
      >
        {/* Tool Icon */}
        <img
          src={tool.icon}
          alt={tool.name}
          className="w-4 h-4 flex-shrink-0"
        />

        {/* Tab Title */}
        <span className="flex-1 truncate text-sm font-medium">
          {displayTitle}
        </span>
      </div>

      {/* Close Button */}
      {!instance.isPinned && (
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 p-0.5 rounded hover:bg-destructive/20
            transition-opacity z-10
            ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          title="Close tab"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Pinned Indicator */}
      {instance.isPinned && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" title="Pinned" />
      )}
    </div>
  );
};
