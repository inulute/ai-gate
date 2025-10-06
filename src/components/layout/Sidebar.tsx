// src/components/layout/Sidebar.tsx
import { useState, useEffect } from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { useSettings } from '@/context/SettingsContext';
import { useUpdate } from '@/context/UpdateContext';
import { useNotifications } from '@/context/NotificationContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart,
  Layout,
  LayoutList,
  LayoutGrid,
  Bot,
  Pencil,
  Trash2,
  Plus,
  Sun,
  Moon,
  Monitor,
  Download,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/favicon';
import useFavicon from '@/hooks/useFavicon';
import { type LayoutType, type AITool } from '@/types/AITool';
import { AddToolForm } from '../forms/AddToolForm';
import { EditToolForm } from '../forms/EditToolForm';
import { SettingsPanel } from '../settings/SettingsPanel';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Sidebar = () => {
  const { tools, selectTool, layout, setLayout, removeTool } = useAITools();
  const { settings, updateSettings, toggleTheme } = useSettings();
  const { hasUpdate, showUpdatePopup } = useUpdate();
  const { unreadCount, setShowPanel } = useNotifications();
  
  const [isCollapsed, setIsCollapsed] = useState(
    settings.isCollapsed ?? true
  );
  const [toolToEdit, setToolToEdit] = useState<AITool | null>(null);
  const [toolToDelete, setToolToDelete] = useState<AITool | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Effect to sync with settings
  useEffect(() => {
    setIsCollapsed(settings.isCollapsed ?? true);
  }, [settings.isCollapsed]);

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    updateSettings({ isCollapsed: newState });
  };

  // Available layout options
  const layouts = [
    { value: '1' as LayoutType, icon: Layout, label: 'Single Panel' },
    { value: '2' as LayoutType, icon: LayoutList, label: 'Two Panels' },
    { value: '3' as LayoutType, icon: LayoutGrid, label: 'Three Panels' },
  ];

  // Delete functions
  const handleDelete = (tool: AITool, e: React.MouseEvent) => {
    e.stopPropagation();
    setToolToDelete(tool);
  };

  const confirmDelete = () => {
    if (toolToDelete) {
      removeTool(toolToDelete.id);
      setToolToDelete(null);
    }
  };

  const handleEdit = (tool: AITool, e: React.MouseEvent) => {
    e.stopPropagation();
    setToolToEdit(tool);
  };

  return (
    <div className="h-screen">
      {/* Main Sidebar Container */}
      <div 
        className={cn(
          "h-full bg-card border-r border-border/30 transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex flex-col h-full p-3">
          <div className="flex justify-center mb-4 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-secondary/80"
              onClick={toggleSidebar}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {/* Layout Selection */}
          <div className="space-y-2 mb-2">
            {layouts.map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={layout === value ? "secondary" : "ghost"}
                className={cn(
                  "w-full text-left justify-start font-normal transition-all duration-300",
                  isCollapsed && "justify-center p-0 h-10 w-10"
                )}
                onClick={() => setLayout(value)}
              >
                <Icon className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span>{label}</span>}
              </Button>
            ))}
          </div>

          <Separator className="my-2" />

          {/* Add Tool Button */}
          <Button
            variant="outline"
            className={cn(
              "my-2 transition-all duration-300",
              isCollapsed ? "w-10 h-10 p-0 mx-auto" : "w-full"
            )}
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="ml-2">Add Tool</span>}
          </Button>

          {/* Tools List */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-1 py-2">
              {tools.map((tool) => (
                <div 
                  key={tool.id} 
                  className={cn(
                    "group relative flex items-center rounded-md hover:bg-muted/50 transition-colors duration-150",
                    isCollapsed ? "justify-center p-2" : "px-2 py-1.5"
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-auto text-left justify-start p-2 font-normal",
                      isCollapsed && "justify-center p-0"
                    )}
                    onClick={(e) => selectTool(tool, e.ctrlKey || e.metaKey)}
                  >
                    {(() => {
                      const iconUrl = useFavicon(tool.url, tool.icon);
                      return (
                        <div className="w-6 h-6 relative shrink-0 flex items-center justify-center">
                          <img
                            src={iconUrl || getFaviconUrl(tool.url) || ''}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover border border-border bg-card"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <Bot className="h-4 w-4 hidden" />
                        </div>
                      );
                    })()}
                    
                    {!isCollapsed && (
                      <span className="ml-3 truncate">{tool.name}</span>
                    )}
                  </Button>
                  
                  {/* Action buttons - visible on hover when expanded */}
                  {!isCollapsed && (
                    <div className="absolute right-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={(e) => handleEdit(tool, e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Tool</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDelete(tool, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Tool</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  
                  {/* Tool names as tooltips when collapsed */}
                  {isCollapsed && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="sr-only">{tool.name}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="flex flex-col gap-1">
                            <p className="font-medium">{tool.name}</p>
                            <div className="flex gap-1 mt-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setToolToEdit(tool);
                                }}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setToolToDelete(tool);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="mt-auto pt-2">
            <Separator className="mb-2" />
            <Button
              variant="ghost"
              className={cn(
                "w-full text-left justify-start font-normal",
                isCollapsed && "justify-center p-0 h-10 w-10"
              )}
              onClick={() => {
                window.open('https://support.inulute.com', '_blank');
              }}
            >
              <Heart className={cn("h-4 w-4 text-red-500 shrink-0", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>Support Project</span>}
            </Button>

            {/* Theme Toggle */}
            <div className="mt-2">
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-left justify-start font-normal transition-all duration-300",
                  isCollapsed && "justify-center p-0 h-10 w-10"
                )}
                onClick={toggleTheme}
              >
                {settings.theme === 'dark' ? (
                  <Sun className={cn("h-4 w-4 shrink-0 transition-transform duration-300 hover:rotate-90", !isCollapsed && "mr-3")} />
                ) : settings.theme === 'light' ? (
                  <Moon className={cn("h-4 w-4 shrink-0 transition-transform duration-300 hover:rotate-90", !isCollapsed && "mr-3")} />
                ) : (
                  <Monitor className={cn("h-4 w-4 shrink-0 transition-transform duration-300 hover:rotate-90", !isCollapsed && "mr-3")} />
                )}
                {!isCollapsed && <span>Theme</span>}
              </Button>
            </div>

            {/* Notifications */}
            <div className="mt-2">
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-left justify-start font-normal relative",
                  isCollapsed && "justify-center p-0 h-10 w-10"
                )}
                onClick={() => setShowPanel(true)}
              >
                <Bell className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span>Notifications</span>}
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs",
                      isCollapsed && "-top-1 -right-1"
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Update Indicator */}
            {hasUpdate && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  className={cn(
                    "w-full text-left justify-start font-normal border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
                    isCollapsed && "justify-center p-0 h-10 w-10"
                  )}
                  onClick={showUpdatePopup}
                >
                  <Download className={cn("h-4 w-4 shrink-0 text-green-600 dark:text-green-400", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span>Update Available</span>}
                </Button>
              </div>
            )}

            {/* Settings */}
            <div className="mt-2">
              <SettingsPanel isCollapsed={isCollapsed} />
            </div>
            
            {/* <Button
              variant="ghost"
              className={cn(
                "w-full text-left justify-start font-normal mt-1",
                isCollapsed && "justify-center p-0 h-10 w-10"
              )}
            >
              <SettingsIcon className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>Settings</span>}
            </Button> */}
          </div>
        </div>
      </div>
      
      {/* Add Tool Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New AI Tool</DialogTitle>
          </DialogHeader>
          <AddToolForm onClose={() => setAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Tool Dialog */}
      {toolToEdit && (
        <EditToolForm
          tool={toolToEdit}
          open={!!toolToEdit}
          onOpenChange={() => setToolToEdit(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!toolToDelete} 
        onOpenChange={(open) => !open && setToolToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <span className="font-medium">{toolToDelete?.name}</span> and
              remove it from your AI tools list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};