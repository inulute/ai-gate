// src/components/workspace/Panel.tsx
import React from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { useSettings } from '@/context/SettingsContext';
import { TabBar } from './TabBar';

interface PanelProps {
  panelId: number;
  // Callback ref for the content area - WorkspaceGrid uses this to position webviews
  contentAreaRef?: (el: HTMLDivElement | null) => void;
}

export const Panel = ({ panelId, contentAreaRef }: PanelProps) => {
  const { getInstancesByPanel, getActivePanelInstance, setActivePanelTab, highlightedPanelId, toolInstances, activePanelTabs } = useAITools();
  const { settings } = useSettings();
  const panelInstances = getInstancesByPanel(panelId);

  // In synced mode, show all instances in tab bar across all panels
  // In separate mode, show only instances for this panel
  const instances = settings.syncedTabs ? toolInstances : panelInstances;
  const activeInstance = getActivePanelInstance(panelId);
  const isHighlighted = highlightedPanelId === panelId;

  // Auto-set active tab if none is set for this panel
  React.useEffect(() => {
    if (instances.length > 0 && !activeInstance) {
      if (settings.syncedTabs) {
        // Prefer an instance not already active in another panel
        const activeIds = new Set(Object.values(activePanelTabs));
        const available = instances.find(inst => !activeIds.has(inst.id));
        // setActivePanelTab handles dedup as a safety net
        setActivePanelTab(panelId, available ? available.id : instances[0].id);
      } else {
        setActivePanelTab(panelId, instances[0].id);
      }
    }
  }, [instances.length, activeInstance, panelId]);

  // Empty state - show only if no tabs to display
  const shouldShowEmptyState = settings.syncedTabs ? toolInstances.length === 0 : panelInstances.length === 0;

  if (shouldShowEmptyState) {
    return (
      <div
        className={`h-full border rounded-lg flex flex-col transition-all duration-300 ${
          isHighlighted
            ? 'border-primary premium-glow ring-4 ring-primary/40'
            : 'border-border'
        }`}
      >
        <div ref={contentAreaRef} className="flex-1 flex items-center justify-center text-muted-foreground bg-secondary/50 dark:bg-secondary/20">
          Select an AI tool from sidebar
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full border rounded-lg flex flex-col overflow-hidden transition-all duration-100 ${
        isHighlighted
          ? 'border-primary premium-glow ring-4 ring-primary/40'
          : 'border-border'
      }`}
    >
      {/* Tab Bar - shows all instances for navigation */}
      <TabBar
        panelId={panelId}
        instances={instances}
        activeInstanceId={activeInstance?.id}
      />

      {/* Content area - webviews are rendered globally by WorkspaceGrid */}
      <div ref={contentAreaRef} className="flex-1 relative overflow-hidden" />
    </div>
  );
};
