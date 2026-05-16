// src/components/workspace/Tab.tsx
import { Bot, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToolInstance, AITool } from '@/types/AITool';
import { useAITools } from '@/context/AIToolsContext';
import { useSettings } from '@/context/SettingsContext';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getFaviconUrl } from '@/lib/favicon';

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
  const [tabIconUrl, setTabIconUrl] = useState(tool.icon || getFaviconUrl(tool.url) || '');
  const [showIconFallback, setShowIconFallback] = useState(false);

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

  useEffect(() => {
    setTabIconUrl(tool.icon || getFaviconUrl(tool.url) || '');
    setShowIconFallback(false);
  }, [tool.icon, tool.url]);

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

  /** Falls back to the provider favicon when a saved tab icon fails. */
  const handleIconError = () => {
    const fallbackUrl = getFaviconUrl(tool.url) || '';
    if (fallbackUrl && tabIconUrl !== fallbackUrl) {
      setTabIconUrl(fallbackUrl);
      return;
    }

    setShowIconFallback(true);
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
        {showIconFallback ? (
          <Bot className="w-4 h-4 flex-shrink-0" />
        ) : (
          <img
            src={tabIconUrl}
            alt={tool.name}
            className="w-4 h-4 flex-shrink-0"
            onError={handleIconError}
          />
        )}

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
