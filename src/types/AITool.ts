// src/types/AITool.ts
export type ToolType = 'webview' | 'api';

export interface AITool {
  id: string;
  name: string;
  url: string;
  type: ToolType;
  icon: string;
  description?: string;
  category?: string;
  isFavorite?: boolean;
}

export interface ToolInstance {
  id: string;
  toolId: string;
  title: string;
  state: ToolState;
  lastActive: Date;
  isPinned: boolean;
  position: number;
}

export interface ToolState {
  scrollPosition?: number;
  formData?: Record<string, any>;
  sessionData?: Record<string, any>;
  lastUrl?: string;
  isLoading?: boolean;
  isMinimized?: boolean;
}

export type LayoutType = '1' | '2' | '3';