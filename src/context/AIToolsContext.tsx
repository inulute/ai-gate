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
    setTools(tools.map(tool => 
      tool.id === updatedTool.id ? updatedTool : tool
    ));
    
    setToolInstances(prev => 
      prev.map(instance => 
        instance.toolId === updatedTool.id 
          ? { ...instance, title: updatedTool.name }
          : instance
      )
    );

    toast({
      title: "Tool Updated",
      description: `${updatedTool.name} has been updated successfully.`,
      duration: 3000
    });
  };

  const removeTool = (id: string) => {
    const tool = tools.find(t => t.id === id);
    setTools(tools.filter(t => t.id !== id));
    setToolInstances(toolInstances.filter(instance => instance.toolId !== id));
    
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
        const currentLayoutNumber = parseInt(layout);

        // Check if the instance's panel is currently visible in the layout
        if (existingInstance.panelId < currentLayoutNumber) {
          // Panel is visible - focus the instance and highlight the panel
          focusInstance(existingInstance.id);
          setActivePanelTab(existingInstance.panelId, existingInstance.id);
          highlightPanel(existingInstance.panelId);

          toast({
            title: "Already Opened",
            description: `${tool.name} is already open in panel ${existingInstance.panelId + 1}.`,
            duration: 2000
          });
          return;
        } else {
          // Panel is not visible (e.g., instance in Panel 1 or 2, but layout is single panel)
          // Move instance to Panel 0 (visible panel)
          moveInstanceToPanel(existingInstance.id, 0);
          setActivePanelTab(0, existingInstance.id);

          toast({
            title: "Tool Focused",
            description: `${tool.name} moved to visible panel.`,
            duration: 2000
          });
          return;
        }
      }
    }

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

    // Find target panel
    let targetPanelId = 0;
    let positionInPanel = 0;
    const layoutNumber = parseInt(shouldExpandLayout ? targetLayout : layout);

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

    if (shouldExpandLayout) {
      setLayoutState(targetLayout);
    }

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
    setActivePanelTabs(current => ({
      ...current,
      [panelId]: instanceId
    }));
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
    // Check if an instance of this tool already exists
    const existingInstance = toolInstances.find(inst => inst.toolId === tool.id);

    if (existingInstance) {
      const layoutNumber = parseInt(layout);

      // Check if the instance's panel is currently visible
      if (existingInstance.panelId < layoutNumber) {
        // Panel is visible - focus and highlight
        focusInstance(existingInstance.id);
        setActivePanelTab(existingInstance.panelId, existingInstance.id);
        highlightPanel(existingInstance.panelId);

        toast({
          title: "Already Opened",
          description: `${tool.name} is already open in panel ${existingInstance.panelId + 1}.`,
          duration: 2000
        });
        return;
      } else {
        // Panel is not visible - move to Panel 0
        moveInstanceToPanel(existingInstance.id, 0);
        setActivePanelTab(0, existingInstance.id);

        toast({
          title: "Tool Focused",
          description: `${tool.name} moved to visible panel.`,
          duration: 2000
        });
        return;
      }
    }

    // Smart panel selection: find empty panel first, then least populated
    const layoutNumber = parseInt(layout);
    let targetPanelId = requestedPanelId;

    // Only apply smart distribution in multi-panel mode (2 or 3 panels)
    if (layoutNumber > 1) {
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
    return activeId ? toolInstances.find(inst => inst.id === activeId) : undefined;
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