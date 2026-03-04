// src/components/workspace/WorkspaceGrid.tsx
import { useRef, useState, useEffect, useCallback } from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { Panel } from './Panel';
import { AIToolView } from './AIToolView';
import { LayoutType } from '@/types/AITool';

interface PanelBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const WorkspaceGrid = () => {
  const { layout, toolInstances, activePanelTabs, getToolById } = useAITools();

  const layoutNumber = parseInt(layout);
  const allPanels = [0, 1, 2];

  // Refs for panel content areas (where webviews should be positioned)
  const contentRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Panel content area bounds (relative to container)
  const [panelBounds, setPanelBounds] = useState<Record<number, PanelBounds>>({});

  // Track which instances have ever been activated (for lazy webview creation)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  // Callback refs for panels to register their content areas
  const setContentRef = useCallback((panelId: number) => {
    return (el: HTMLDivElement | null) => {
      contentRefs.current[panelId] = el;
    };
  }, []);

  // Update visited IDs when active tabs change
  useEffect(() => {
    setVisitedIds(prev => {
      let changed = false;
      const next = new Set(prev);

      // Add currently active instances
      for (let i = 0; i < 3; i++) {
        const activeId = activePanelTabs[i];
        if (activeId && !next.has(activeId)) {
          next.add(activeId);
          changed = true;
        }
      }

      // Clean up removed instances
      const instanceIds = new Set(toolInstances.map(inst => inst.id));
      next.forEach(id => {
        if (!instanceIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [activePanelTabs, toolInstances]);

  // ResizeObserver to track panel content area bounds
  useEffect(() => {
    const updateBounds = () => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const newBounds: Record<number, PanelBounds> = {};
      contentRefs.current.forEach((el, idx) => {
        if (el && idx < layoutNumber) {
          const rect = el.getBoundingClientRect();
          newBounds[idx] = {
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
          };
        }
      });
      setPanelBounds(newBounds);
    };

    const observer = new ResizeObserver(updateBounds);

    // Observe the container for overall layout changes
    if (containerRef.current) observer.observe(containerRef.current);

    // Observe individual panel content areas for size changes
    contentRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    // Initial bounds calculation after layout settles
    requestAnimationFrame(updateBounds);

    return () => observer.disconnect();
  }, [layoutNumber]);

  const gridCols: Record<LayoutType, string> = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3'
  };

  return (
    <div ref={containerRef} className="relative h-full">
      {/* Layer 1: Panel shells (tab bars, borders, empty content areas) */}
      <div
        className={`grid ${gridCols[layout]} gap-4 h-full p-4`}
        style={{
          transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          gridTemplateColumns: layout === '1' ? '1fr' : layout === '2' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
        }}
      >
        {allPanels.map((panelId) => (
          <div
            key={panelId}
            className="w-full h-full"
            style={{
              display: panelId < layoutNumber ? 'block' : 'none'
            }}
          >
            <Panel
              panelId={panelId}
              contentAreaRef={setContentRef(panelId)}
            />
          </div>
        ))}
      </div>

      {/* Layer 2: Global webview pool (absolute positioned over panel content areas) */}
      {/* Each webview is rendered ONCE with a stable key (instance.id only). */}
      {/* When layout changes, webviews reposition via CSS — no DOM recreation. */}
      {/* This preserves webview state (URL, scroll, session) across layout switches. */}
      {toolInstances
        .filter(inst => visitedIds.has(inst.id))
        .map(instance => {
          const tool = getToolById(instance.toolId);
          if (!tool) return null;

          // Find which VISIBLE panel this instance is active in
          let activePanelId: number | null = null;
          for (let i = 0; i < layoutNumber; i++) {
            if (activePanelTabs[i] === instance.id) {
              activePanelId = i;
              break;
            }
          }

          const isActive = activePanelId !== null;
          const bounds = activePanelId !== null ? panelBounds[activePanelId] : null;

          return (
            <div
              key={instance.id}
              style={{
                position: 'absolute',
                // Active webviews: positioned exactly over their panel's content area
                // Inactive webviews: hidden but kept alive with last known size
                left: bounds ? bounds.left : 0,
                top: bounds ? bounds.top : 0,
                width: bounds ? bounds.width : 0,
                height: bounds ? bounds.height : 0,
                visibility: isActive && bounds ? 'visible' : 'hidden',
                zIndex: isActive ? 5 : -1,
                pointerEvents: isActive ? 'auto' : 'none',
                // Smooth repositioning when layout changes
                transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                borderRadius: '0 0 0.5rem 0.5rem', // Match panel border radius at bottom
              }}
            >
              <AIToolView
                tool={tool}
                instance={instance}
                isVisible={!!isActive}
              />
            </div>
          );
        })}
    </div>
  );
};
