// src/context/AIToolsContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AITool, LayoutType, ToolInstance, ToolState } from '@/types/AITool';
import { useToast } from "@/hooks/use-toast";
import { useSettings } from './SettingsContext';

interface AIToolsContextType {
  tools: AITool[];
  toolInstances: ToolInstance[];
  layout: LayoutType;
  activePanelTabs: Record<number, string>; // Track active tab per panel
  highlightedPanelId: number | null; // Track which panel should be highlighted
  addTool: (tool: AITool) => void;
  updateTool: (tool: AITool) => void;
  removeTool: (id: string) => void;
  selectTool: (tool: AITool, createNewInstance?: boolean) => void;
  setLayout: (layout: LayoutType) => void;
  closeToolInstance: (instanceId: string) => void;
  closeAllInstances: () => void;
  updateToolInstance: (instanceId: string, updates: Partial<ToolInstance>) => void;
  updateToolState: (instanceId: string, state: Partial<ToolState>) => void;
  pinToolInstance: (instanceId: string) => void;
  unpinToolInstance: (instanceId: string) => void;
  reorderInstances: (fromIndex: number, toIndex: number) => void;
  getToolById: (toolId: string) => AITool | undefined;
  getInstanceById: (instanceId: string) => ToolInstance | undefined;
  focusInstance: (instanceId: string) => void;
  getActiveInstance: () => ToolInstance | undefined;
  // New panel management methods
  moveInstanceToPanel: (instanceId: string, targetPanelId: number, position?: number) => void;
  reorderTabInPanel: (panelId: number, fromIndex: number, toIndex: number) => void;
  setActivePanelTab: (panelId: number, instanceId: string) => void;
  duplicateInstance: (instanceId: string, targetPanelId?: number) => void;
  renameInstance: (instanceId: string, customTitle: string) => void;
  createInstanceInPanel: (tool: AITool, targetPanelId: number) => void;
  getInstancesByPanel: (panelId: number) => ToolInstance[];
  getActivePanelInstance: (panelId: number) => ToolInstance | undefined;
  highlightPanel: (panelId: number) => void;
}

const AIToolsContext = createContext<AIToolsContextType | undefined>(undefined);

export const AIToolsProvider = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [tools, setTools] = useLocalStorage<AITool[]>('ai-tools', []);
  const [toolInstances, setToolInstances] = useLocalStorage<ToolInstance[]>('tool-instances', []);
  const [recentlyClosed, setRecentlyClosed] = useState<ToolInstance[]>([]);
  const [activePanelTabs, setActivePanelTabs] = useLocalStorage<Record<number, string>>('active-panel-tabs', {});
  const [highlightedPanelId, setHighlightedPanelId] = useState<number | null>(null);

  const [layout, setLayoutState] = useLocalStorage<LayoutType>(
    'layout',
    (settings.defaultLayout || '2') as LayoutType
  );

  // Seed default tools on first run
  useEffect(() => {
    if (tools.length === 0) {
      const defaults: AITool[] = [
        { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', type: 'webview', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg' },
        { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', type: 'webview', icon: 'https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg' },
        { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', type: 'webview', icon: 'https://www.perplexity.ai/favicon.ico' },
        { id: 'qwen', name: 'Qwen', url: 'https://chat.qwen.ai', type: 'webview', icon: 'https://assets.alicdn.com/g/qwenweb/qwen-webui-fe/0.0.208/favicon.png' },
        { id: 'claude', name: 'Claude', url: 'https://claude.ai', type: 'webview', icon: 'https://claude.ai/favicon.ico' },
        { id: 'grok', name: 'Grok', url: 'https://grok.com', type: 'webview', icon: 'https://grok.com/images/favicon-dark.png' },
      ];
      setTools(defaults);
    }
  }, []);

  // Migration: Assign panelId to existing instances
  useEffect(() => {
    const layoutNumber = parseInt(layout);
    let needsMigration = false;

    const migratedInstances = toolInstances.map((instance, index) => {
      if (instance.panelId === undefined || instance.positionInPanel === undefined) {
        needsMigration = true;
        return {
          ...instance,
          panelId: index % layoutNumber,
          positionInPanel: Math.floor(index / layoutNumber),
        };
      }
      return instance;
    });

    if (needsMigration) {
      console.log('Migrating instances to panel system');
      setToolInstances(migratedInstances);

      // Set first instance of each panel as active
      const newActiveTabs: Record<number, string> = {};
      for (let i = 0; i < layoutNumber; i++) {
        const panelInstances = migratedInstances.filter(inst => inst.panelId === i);
        if (panelInstances.length > 0) {
          newActiveTabs[i] = panelInstances[0].id;
        }
      }
      setActivePanelTabs(newActiveTabs);
    }
  }, [layout, toolInstances.length]);

  useEffect(() => {
    const hasInitialized = sessionStorage.getItem('app-initialized') === 'true';
    if (hasInitialized || tools.length === 0) return;

    const defaultLayout = settings.defaultLayout || '2';
    const layoutNumber = parseInt(defaultLayout);
    setLayoutState(defaultLayout as LayoutType);

    const defaultToolIds = settings.defaultTools || ['chatgpt', 'gemini'];
    const toolsToUse = defaultToolIds
      .map(id => tools.find(tool => tool.id === id))
      .filter(Boolean)
      .slice(0, layoutNumber) as AITool[];

    if (toolsToUse.length < layoutNumber) {
      const remainingTools = tools.filter(tool => !defaultToolIds.includes(tool.id));
      toolsToUse.push(...remainingTools.slice(0, layoutNumber - toolsToUse.length));
    }

    if (toolsToUse.length > 0) {
      const instances: ToolInstance[] = toolsToUse.map((tool, index) => ({
        id: `${tool.id}-${Date.now()}-${index}`,
        toolId: tool.id,
        title: tool.name,
        state: {
          lastUrl: tool.url,
          isLoading: false,
          isMinimized: false
        },
        lastActive: new Date(),
        isPinned: false,
        position: index,
        panelId: index, // Each tool gets its own panel initially
        positionInPanel: 0 // First tab in that panel
      }));
      setToolInstances(instances);

      // Set each instance as active in its panel
      const initialActiveTabs: Record<number, string> = {};
      instances.forEach((instance, index) => {
        initialActiveTabs[index] = instance.id;
      });
      setActivePanelTabs(initialActiveTabs);
    }

    sessionStorage.setItem('app-initialized', 'true');
  }, [tools, settings.defaultTools, settings.defaultLayout]);

  useEffect(() => {
    if (!settings.autoLayout) {
      const desired = (settings.defaultLayout || '1') as LayoutType;
      if (layout !== desired) {
        setLayoutState(desired);
      }
    }
  }, [settings.autoLayout, settings.defaultLayout]);

  const setLayout = (newLayout: LayoutType) => {
    setLayoutState(newLayout);
    toast({
      title: "Layout Changed",
      description: `Switched to ${parseInt(newLayout)} panel layout.`,
      duration: 2000
    });
  };

  const addTool = (tool: AITool) => {
    setTools(prev => [...prev, tool]);
    toast({
      title: "Tool Added",
      description: `${tool.name} has been added successfully.`,
      duration: 3000
    });
  };

  const updateTool = (updatedTool: AITool) => {
    setTools(prev => prev.map(tool =>
      tool.id === updatedTool.id ? updatedTool : tool
    ));

    // Only update instances if the tool name actually changed
    // This avoids unnecessary re-renders of all webview containers
    setToolInstances(prev => {
      const needsUpdate = prev.some(
        inst => inst.toolId === updatedTool.id && inst.title !== updatedTool.name
      );
      if (!needsUpdate) return prev; // Same reference = no re-render
      return prev.map(instance =>
        instance.toolId === updatedTool.id
          ? { ...instance, title: updatedTool.name }
          : instance
      );
    });

    toast({
      title: "Tool Updated",
      description: `${updatedTool.name} has been updated successfully.`,
      duration: 3000
    });
  };

  const removeTool = (id: string) => {
    const tool = tools.find(t => t.id === id);
    setTools(prev => prev.filter(t => t.id !== id));
    setToolInstances(prev => prev.filter(instance => instance.toolId !== id));

    toast({
      title: "Tool Removed",
      description: tool ? `${tool.name} has been removed.` : 'Tool has been removed.',
      duration: 3000
    });
  };

  const selectTool = (tool: AITool, createNewInstance = false) => {
    if (!createNewInstance) {
      const existingInstance = toolInstances.find(instance => instance.toolId === tool.id);
      if (existingInstance) {
        // Focus the instance and highlight the panel (regardless of visibility)
        // In synced tabs mode, the tab will be visible in all panels anyway
        focusInstance(existingInstance.id);
        setActivePanelTab(existingInstance.panelId, existingInstance.id);
        highlightPanel(existingInstance.panelId);

        toast({
          title: "Already Opened",
          description: `${tool.name} is already open in panel ${existingInstance.panelId + 1}.`,
          duration: 2000
        });
        return;
      }
    }

    // CRITICAL: Expand layout FIRST before calculating target panel
    // This ensures panelId calculations are based on the correct layout
    const unpinnedInstances = toolInstances.filter(instance => !instance.isPinned);
    const totalVisible = unpinnedInstances.length + 1;
    let targetLayout = layout;
    let shouldExpandLayout = false;

    if (settings.autoLayout) {
      if (layout === '1' && totalVisible >= 2) {
        targetLayout = '2';
        shouldExpandLayout = true;
      } else if (layout === '2' && totalVisible >= 3) {
        targetLayout = '3';
        shouldExpandLayout = true;
      }
    }

    // Expand layout BEFORE calculating target panel to avoid mismatches
    if (shouldExpandLayout) {
      setLayoutState(targetLayout);
    }

    // Find target panel using the FINAL layout (after expansion)
    let targetPanelId = 0;
    let positionInPanel = 0;
    const layoutNumber = parseInt(targetLayout);

    if (createNewInstance) {
      // Ctrl+Click: add to same panel as existing instance of this tool
      const existingInstance = toolInstances.find(instance => instance.toolId === tool.id);
      if (existingInstance) {
        targetPanelId = existingInstance.panelId;
        const panelInstances = toolInstances.filter(inst => inst.panelId === targetPanelId);
        positionInPanel = panelInstances.length;
      }
    } else {
      // Regular click: find first empty panel, or least populated panel
      let foundEmptyPanel = false;
      for (let i = 0; i < layoutNumber; i++) {
        const panelInstances = toolInstances.filter(inst => inst.panelId === i);
        if (panelInstances.length === 0) {
          targetPanelId = i;
          positionInPanel = 0;
          foundEmptyPanel = true;
          break;
        }
      }

      // If no empty panel found, use the panel with least instances
      if (!foundEmptyPanel) {
        let minCount = Infinity;
        for (let i = 0; i < layoutNumber; i++) {
          const panelInstances = toolInstances.filter(inst => inst.panelId === i);
          if (panelInstances.length < minCount) {
            minCount = panelInstances.length;
            targetPanelId = i;
            positionInPanel = panelInstances.length;
          }
        }
      }
    }

    const newInstance: ToolInstance = {
      id: `${tool.id}-${Date.now()}`,
      toolId: tool.id,
      title: tool.name,
      state: {
        lastUrl: tool.url,
        isLoading: true,
        isMinimized: false
      },
      lastActive: new Date(),
      isPinned: false,
      position: toolInstances.length,
      panelId: targetPanelId,
      positionInPanel: positionInPanel
    };

    setToolInstances(current => [...current, newInstance]);
    setActivePanelTab(targetPanelId, newInstance.id);

    toast({
      title: "Tool Opened",
      description: `${tool.name} opened in new tab.`,
      duration: 1500
    });
  };

  // CRITICAL FIX: Just update lastActive timestamp - DON'T reorder the array!
  const focusInstance = (instanceId: string) => {
    setToolInstances(current => 
      current.map(instance => 
        instance.id === instanceId 
          ? { ...instance, lastActive: new Date() }
          : instance
      )
    );
    
    const instance = toolInstances.find(inst => inst.id === instanceId);
    if (instance && layout !== '1') {
      toast({
        title: "Tab Focused",
        description: `Switched to ${instance.title}.`,
        duration: 1000
      });
    }
  };

  const closeToolInstance = (instanceId: string) => {
    const instance = toolInstances.find(inst => inst.id === instanceId);
    if (!instance) return;

    setToolInstances(current => {
      const updated = current.filter(inst => inst.id !== instanceId);
      return updated.map((inst, index) => ({ ...inst, position: index }));
    });
    
    // Clean up activePanelTabs if the closed instance was active
    setActivePanelTabs(current => {
      const updated = { ...current };
      // Check if this instance was active in any panel
      Object.keys(updated).forEach(pid => {
        if (updated[parseInt(pid)] === instanceId) {
          // Find another instance in this panel to activate
          const remainingInstances = toolInstances
            .filter(inst => inst.id !== instanceId && inst.panelId === parseInt(pid))
            .sort((a, b) => a.positionInPanel - b.positionInPanel);
          
          if (remainingInstances.length > 0) {
            updated[parseInt(pid)] = remainingInstances[0].id;
          } else {
            // No instances left in this panel, remove the active tab entry
            delete updated[parseInt(pid)];
          }
        }
      });
      return updated;
    });
    
    setRecentlyClosed(prev => [instance, ...prev.slice(0, 4)]);
    
    toast({
      title: "Tab Closed",
      description: `${instance.title} closed. Use Ctrl+Z to undo.`,
      duration: 2000
    });
  };

  const closeAllInstances = () => {
    const unpinnedInstances = toolInstances.filter(instance => !instance.isPinned);
    setToolInstances(current => current.filter(instance => instance.isPinned));
    setRecentlyClosed(prev => [...unpinnedInstances, ...prev.slice(0, 5 - unpinnedInstances.length)]);
    
    toast({
      title: "All Tabs Closed",
      description: `${unpinnedInstances.length} tabs closed.`,
      duration: 2000
    });
  };

  const updateToolInstance = (instanceId: string, updates: Partial<ToolInstance>) => {
    setToolInstances(current => 
      current.map(instance => 
        instance.id === instanceId 
          ? { ...instance, ...updates }
          : instance
      )
    );
  };

  const updateToolState = (instanceId: string, state: Partial<ToolState>) => {
    setToolInstances(current => 
      current.map(instance => 
        instance.id === instanceId 
          ? { ...instance, state: { ...instance.state, ...state } }
          : instance
      )
    );
  };

  const pinToolInstance = (instanceId: string) => {
    updateToolInstance(instanceId, { isPinned: true });
    toast({
      title: "Tab Pinned",
      description: "Tab will stay in workspace.",
      duration: 1500
    });
  };

  const unpinToolInstance = (instanceId: string) => {
    updateToolInstance(instanceId, { isPinned: false });
    toast({
      title: "Tab Unpinned",
      description: "Tab can be closed when space is needed.",
      duration: 1500
    });
  };

  const reorderInstances = (fromIndex: number, toIndex: number) => {
    setToolInstances(current => {
      const newInstances = [...current];
      const [movedInstance] = newInstances.splice(fromIndex, 1);
      newInstances.splice(toIndex, 0, movedInstance);
      
      return newInstances.map((instance, index) => ({
        ...instance,
        position: index
      }));
    });
  };

  const getToolById = (toolId: string) => {
    return tools.find(tool => tool.id === toolId);
  };

  const getInstanceById = (instanceId: string) => {
    return toolInstances.find(instance => instance.id === instanceId);
  };

  const getActiveInstance = () => {
    return toolInstances
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())[0];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && recentlyClosed.length > 0) {
        e.preventDefault();
        const lastClosed = recentlyClosed[0];
        setToolInstances(current => [...current, lastClosed]);
        setRecentlyClosed(prev => prev.slice(1));
        
        toast({
          title: "Tab Restored",
          description: `${lastClosed.title} restored.`,
          duration: 1500
        });
      }
      
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const activeInstance = getActiveInstance();
        if (activeInstance) {
          closeToolInstance(activeInstance.id);
        }
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'w') {
        e.preventDefault();
        closeAllInstances();
      }
      
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const instance = toolInstances[index];
        if (instance) {
          focusInstance(instance.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toolInstances, recentlyClosed]);

  // Cleanup: Validate activePanelTabs when instances or layout change
  // NOTE: activePanelTabs is NOT in deps to prevent infinite loops.
  // Dedup is handled by setActivePanelTab, this only handles:
  // 1. Deleted instances → find replacement
  // 2. Separate mode → ensure instance belongs to panel
  // 3. Panels beyond layout → clean up stale entries
  useEffect(() => {
    const instanceIds = new Set(toolInstances.map(inst => inst.id));
    const layoutNumber = parseInt(layout);

    setActivePanelTabs(current => {
      const updated = { ...current };
      let hasChanges = false;

      for (let panelId = 0; panelId < layoutNumber; panelId++) {
        const activeId = updated[panelId];

        if (!activeId || !instanceIds.has(activeId)) {
          // No active tab or active instance was deleted - find replacement
          const candidates = (settings.syncedTabs
            ? toolInstances
            : toolInstances.filter(inst => inst.panelId === panelId)
          ).sort((a, b) => a.positionInPanel - b.positionInPanel);

          if (candidates.length > 0) {
            // Prefer instance not already active in another panel
            const otherActiveIds = new Set(
              Object.entries(updated)
                .filter(([pid]) => parseInt(pid) !== panelId && parseInt(pid) < layoutNumber)
                .map(([, id]) => id)
            );
            const preferred = candidates.find(inst => !otherActiveIds.has(inst.id));
            updated[panelId] = preferred ? preferred.id : candidates[0].id;
          } else {
            delete updated[panelId];
          }
          hasChanges = true;
        } else if (!settings.syncedTabs) {
          // In separate mode, verify the instance belongs to this panel
          const instance = toolInstances.find(inst => inst.id === activeId);
          if (instance && instance.panelId !== panelId) {
            const panelCandidates = toolInstances
              .filter(inst => inst.panelId === panelId)
              .sort((a, b) => a.positionInPanel - b.positionInPanel);

            if (panelCandidates.length > 0) {
              updated[panelId] = panelCandidates[0].id;
            } else {
              delete updated[panelId];
            }
            hasChanges = true;
          }
        }
      }

      // Clean up entries for panels beyond current layout
      Object.keys(updated).forEach(pidStr => {
        const pid = parseInt(pidStr);
        if (pid >= layoutNumber) {
          delete updated[pid];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : current;
    });
  }, [toolInstances, layout, settings.syncedTabs]);

  // New panel management methods
  const moveInstanceToPanel = (instanceId: string, targetPanelId: number, position?: number) => {
    setToolInstances(current => {
      const instance = current.find(inst => inst.id === instanceId);
      if (!instance) return current;

      const targetPanelInstances = current.filter(inst => inst.panelId === targetPanelId);
      const newPosition = position ?? targetPanelInstances.length;

      return current.map(inst => {
        if (inst.id === instanceId) {
          return { ...inst, panelId: targetPanelId, positionInPanel: newPosition };
        }
        // Reorder other instances in target panel
        if (inst.panelId === targetPanelId && inst.positionInPanel >= newPosition) {
          return { ...inst, positionInPanel: inst.positionInPanel + 1 };
        }
        return inst;
      });
    });

    setActivePanelTab(targetPanelId, instanceId);
  };

  const reorderTabInPanel = (panelId: number, fromIndex: number, toIndex: number) => {
    setToolInstances(current => {
      const panelInstances = current
        .filter(inst => inst.panelId === panelId)
        .sort((a, b) => a.positionInPanel - b.positionInPanel);

      const [movedInstance] = panelInstances.splice(fromIndex, 1);
      panelInstances.splice(toIndex, 0, movedInstance);

      const updatedPositions = new Map(
        panelInstances.map((inst, index) => [inst.id, index])
      );

      return current.map(inst => {
        if (inst.panelId === panelId) {
          const newPos = updatedPositions.get(inst.id);
          return newPos !== undefined ? { ...inst, positionInPanel: newPos } : inst;
        }
        return inst;
      });
    });
  };

  const setActivePanelTab = (panelId: number, instanceId: string) => {
    setActivePanelTabs(current => {
      const updated = { ...current, [panelId]: instanceId };

      // In synced mode, enforce uniqueness: each instance active in at most one panel
      if (settings.syncedTabs) {
        const layoutNumber = parseInt(layout);
        for (let i = 0; i < layoutNumber; i++) {
          if (i !== panelId && updated[i] === instanceId) {
            // Panel i has the same instance - find an alternative
            const activeIds = new Set(
              Object.entries(updated)
                .filter(([pid]) => parseInt(pid) < layoutNumber)
                .map(([, id]) => id)
            );
            const alternative = toolInstances.find(inst => !activeIds.has(inst.id));
            if (alternative) {
              updated[i] = alternative.id;
            }
            // If no alternative (more panels than instances), duplicate is unavoidable
          }
        }
      }

      return updated;
    });
  };

  const duplicateInstance = (instanceId: string, targetPanelId?: number) => {
    const instance = toolInstances.find(inst => inst.id === instanceId);
    if (!instance) return;

    const tool = getToolById(instance.toolId);
    if (!tool) return;

    const panelId = targetPanelId ?? instance.panelId;
    const panelInstances = toolInstances.filter(inst => inst.panelId === panelId);

    const newInstance: ToolInstance = {
      ...instance,
      id: `${instance.toolId}-${Date.now()}`,
      panelId,
      positionInPanel: panelInstances.length,
      position: toolInstances.length,
      lastActive: new Date(),
    };

    setToolInstances(current => [...current, newInstance]);
    setActivePanelTab(panelId, newInstance.id);

    toast({
      title: "Tab Duplicated",
      description: `Created new ${tool.name} tab.`,
      duration: 1500
    });
  };

  const renameInstance = (instanceId: string, customTitle: string) => {
    updateToolInstance(instanceId, { customTitle });
  };

  const createInstanceInPanel = (tool: AITool, requestedPanelId: number) => {
    // Check if an instance of this tool already exists in the REQUESTED panel
    // Allow multiple instances of the same tool - only check within the requested panel
    const existingInstanceInPanel = toolInstances.find(
      inst => inst.toolId === tool.id && inst.panelId === requestedPanelId
    );

    if (existingInstanceInPanel) {
      // If it exists in this panel, just focus it
      focusInstance(existingInstanceInPanel.id);
      setActivePanelTab(requestedPanelId, existingInstanceInPanel.id);
      highlightPanel(requestedPanelId);

      toast({
        title: "Already Opened",
        description: `${tool.name} is already open in this panel.`,
        duration: 2000
      });
      return;
    }

    // Use the requested panel ID - respect user's explicit choice
    // Only apply smart distribution if the requested panel is invalid (out of bounds)
    const layoutNumber = parseInt(layout);
    let targetPanelId = requestedPanelId;

    // Validate requested panel is within layout bounds
    if (requestedPanelId < 0 || requestedPanelId >= layoutNumber) {
      // Requested panel is invalid, use smart distribution
      let foundEmptyPanel = false;

      // First, try to find an empty panel
      for (let i = 0; i < layoutNumber; i++) {
        const panelInstances = toolInstances.filter(inst => inst.panelId === i);
        if (panelInstances.length === 0) {
          targetPanelId = i;
          foundEmptyPanel = true;
          break;
        }
      }

      // If no empty panel, use the panel with fewest instances
      if (!foundEmptyPanel) {
        let minCount = Infinity;
        for (let i = 0; i < layoutNumber; i++) {
          const panelInstances = toolInstances.filter(inst => inst.panelId === i);
          if (panelInstances.length < minCount) {
            minCount = panelInstances.length;
            targetPanelId = i;
          }
        }
      }
    }

    const panelInstances = toolInstances.filter(inst => inst.panelId === targetPanelId);

    const newInstance: ToolInstance = {
      id: `${tool.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      toolId: tool.id,
      title: tool.name,
      state: {
        lastUrl: tool.url,
        isLoading: true,
        isMinimized: false
      },
      lastActive: new Date(),
      isPinned: false,
      position: toolInstances.length,
      panelId: targetPanelId,
      positionInPanel: panelInstances.length
    };

    setToolInstances(current => [...current, newInstance]);
    setActivePanelTab(targetPanelId, newInstance.id);

    toast({
      title: "Tool Opened",
      description: `${tool.name} opened in panel ${targetPanelId + 1}.`,
      duration: 1500
    });
  };

  const getInstancesByPanel = (panelId: number): ToolInstance[] => {
    return toolInstances
      .filter(inst => inst.panelId === panelId)
      .sort((a, b) => a.positionInPanel - b.positionInPanel);
  };

  const getActivePanelInstance = (panelId: number): ToolInstance | undefined => {
    const activeId = activePanelTabs[panelId];
    if (!activeId) return undefined;
    
    const instance = toolInstances.find(inst => inst.id === activeId);
    
    // If instance doesn't exist or doesn't belong to this panel (in separate mode), return undefined
    // In synced mode, any instance can be active in any panel
    if (!instance) return undefined;
    
    // In separate mode, verify the instance belongs to this panel
    if (!settings.syncedTabs && instance.panelId !== panelId) {
      return undefined;
    }
    
    return instance;
  };

  const highlightPanel = (panelId: number) => {
    setHighlightedPanelId(panelId);
    // Auto-clear the highlight after 2 seconds
    setTimeout(() => {
      setHighlightedPanelId(null);
    }, 2000);
  };

  const contextValue: AIToolsContextType = useMemo(() => ({
    tools,
    toolInstances,
    layout,
    activePanelTabs,
    highlightedPanelId,
    addTool,
    updateTool,
    removeTool,
    selectTool,
    setLayout,
    closeToolInstance,
    closeAllInstances,
    updateToolInstance,
    updateToolState,
    pinToolInstance,
    unpinToolInstance,
    reorderInstances,
    getToolById,
    getInstanceById,
    focusInstance,
    getActiveInstance,
    // New panel methods
    moveInstanceToPanel,
    reorderTabInPanel,
    setActivePanelTab,
    duplicateInstance,
    renameInstance,
    createInstanceInPanel,
    getInstancesByPanel,
    getActivePanelInstance,
    highlightPanel,
  }), [
    tools,
    toolInstances,
    layout,
    activePanelTabs,
    highlightedPanelId,
    settings.syncedTabs,
  ]);

  return (
    <AIToolsContext.Provider value={contextValue}>
      {children}
    </AIToolsContext.Provider>
  );
};

export const useAITools = () => {
  const context = useContext(AIToolsContext);
  if (!context) {
    throw new Error('useAITools must be used within AIToolsProvider');
  }
  return context;
};

export type { AIToolsContextType };