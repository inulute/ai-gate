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
}

const AIToolsContext = createContext<AIToolsContextType | undefined>(undefined);

export const AIToolsProvider = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [tools, setTools] = useLocalStorage<AITool[]>('ai-tools', []);
  const [toolInstances, setToolInstances] = useLocalStorage<ToolInstance[]>('tool-instances', []);
  const [recentlyClosed, setRecentlyClosed] = useState<ToolInstance[]>([]);
  
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
        position: index
      }));
      setToolInstances(instances);
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
        focusInstance(existingInstance.id);
        return;
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
      position: toolInstances.length
    };

    if (shouldExpandLayout) {
      setLayoutState(targetLayout);
    }
    
    setToolInstances(current => [...current, newInstance]);

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

  const contextValue: AIToolsContextType = useMemo(() => ({
    tools,
    toolInstances,
    layout,
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
  }), [
    tools,
    toolInstances,
    layout,
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