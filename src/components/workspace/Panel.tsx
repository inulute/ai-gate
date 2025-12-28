// src/components/workspace/Panel.tsx
import React from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { useSettings } from '@/context/SettingsContext';
import { AIToolView } from './AIToolView';
import { TabBar } from './TabBar';

interface PanelProps {
  panelId: number;
}

export const Panel = ({ panelId }: PanelProps) => {
  const { getInstancesByPanel, getActivePanelInstance, getToolById, setActivePanelTab, highlightedPanelId, toolInstances } = useAITools();
  const { settings } = useSettings();
  const panelInstances = getInstancesByPanel(panelId);

  // In synced mode, show all instances across all panels
  // In separate mode, show only instances for this panel
  const instances = settings.syncedTabs ? toolInstances : panelInstances;
  const activeInstance = getActivePanelInstance(panelId);
  const isHighlighted = highlightedPanelId === panelId;

  // Auto-set first instance as active if none is active
  // BUT only for instances that belong to THIS panel
  React.useEffect(() => {
    if (panelInstances.length > 0 && !activeInstance) {
      setActivePanelTab(panelId, panelInstances[0].id);
    }
  }, [panelInstances, activeInstance, panelId, setActivePanelTab]);

  // Empty state - no instances in this panel (check actual panel instances, not synced tabs)
  if (panelInstances.length === 0) {
    return (
      <div
        className={`h-full border rounded-lg flex flex-col transition-all duration-300 ${
          isHighlighted
            ? 'border-primary premium-glow ring-4 ring-primary/40'
            : 'border-border'
        }`}
      >
        <div className="flex-1 flex items-center justify-center text-muted-foreground bg-secondary/50 dark:bg-secondary/20">
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
      {/* Tab Bar */}
      <TabBar
        panelId={panelId}
        instances={instances}
        activeInstanceId={activeInstance?.id}
      />

      {/* Tool Views Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* ALWAYS render only instances that belong to THIS panel */}
        {/* Webviews should only exist in their home panel */}
        {panelInstances.map((instance) => {
          const tool = getToolById(instance.toolId);
          if (!tool) return null;

          // Check if this instance is active in THIS panel
          const isActiveInThisPanel = activeInstance?.id === instance.id;

          return (
            <div
              key={instance.id}
              className="w-full h-full absolute top-0 left-0"
              style={{
                visibility: isActiveInThisPanel ? 'visible' : 'hidden',
                zIndex: isActiveInThisPanel ? 1 : 0,
                pointerEvents: isActiveInThisPanel ? 'auto' : 'none',
              }}
            >
              <AIToolView
                tool={tool}
                instance={instance}
                isVisible={isActiveInThisPanel}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
