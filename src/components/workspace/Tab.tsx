// src/components/workspace/Tab.tsx
import { X } from 'lucide-react';
import { ToolInstance, AITool } from '@/types/AITool';
import { useAITools } from '@/context/AIToolsContext';
import { useSettings } from '@/context/SettingsContext';
import { useSortable } from '@dnd-kit/sortable';
import { ToolIcon } from '@/components/ToolIcon';

interface TabProps {
  instance: ToolInstance;
  tool: AITool;
  isActive: boolean;
  onClose: () => void;
  panelId: number; // The current panel this tab is being displayed in
  tabNumber: number;
}

export const Tab = ({ instance, tool, isActive, onClose, panelId, tabNumber }: TabProps) => {
  const { setActivePanelTab, highlightPanel } = useAITools();
  const { settings } = useSettings();
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
    // 2D translate avoids GPU compositing layer promotion that conflicts with Electron webviews
    transform: transform ? `translate(${Math.round(transform.x)}px, 0px)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayTitle = instance.customTitle || instance.title;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent drag from interfering with click
    e.stopPropagation();

    // In separate mode, check if instance belongs to this panel
    if (!settings.syncedTabs && instance.panelId !== panelId) {
      // Can't activate instance from another panel - highlight where it lives
      highlightPanel(instance.panelId);
      return;
    }

    // setActivePanelTab handles uniqueness enforcement in synced mode:
    // if this instance is active in another panel, it automatically
    // finds an alternative for that panel.
    setActivePanelTab(panelId, instance.id);
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
      data-testid={`tab-${instance.id}`}
      data-tool-id={instance.toolId}
      data-panel-id={panelId}
      data-active={isActive ? 'true' : 'false'}
      className={`
        group relative flex items-center gap-2 px-3 py-2 flex-1 min-w-[80px] max-w-[200px]
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
        <ToolIcon
          url={tool.url}
          icon={tool.icon}
          name={tool.name}
          className="w-4 h-4 flex-shrink-0"
        />

        {/* Tab Title */}
        <span className="flex-1 truncate text-sm font-medium">
          {settings.showTabNumbers && <span className="text-muted-foreground">{tabNumber}: </span>}
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
