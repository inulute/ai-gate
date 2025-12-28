// src/components/settings/SettingsPanel.tsx
import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useShortcuts } from '@/context/ShortcutsContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Sun, Moon, Monitor, Save, Keyboard, RotateCcw, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LayoutType } from '@/types/AITool';
import { useToast } from "@/hooks/use-toast";
import { ShortcutEditor } from './ShortcutEditor';
import { DefaultToolsSelector } from './DefaultToolsSelector';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsPanelProps {
  isCollapsed?: boolean;
}

export const SettingsPanel = ({ isCollapsed = false }: SettingsPanelProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shortcuts'>('general');
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const { settings, updateSettings, setAutostart } = useSettings();
  const { shortcuts, resetAllShortcuts } = useShortcuts();
  const { toast } = useToast();
  
  const [tempSettings, setTempSettings] = useState({
    theme: settings.theme,
    defaultLayout: settings.defaultLayout,
    defaultTools: settings.defaultTools || [],
    autoLayout: settings.autoLayout ?? true,
    syncedTabs: settings.syncedTabs ?? true,
  });
  
  useEffect(() => {
    setTempSettings({
      theme: settings.theme,
      defaultLayout: settings.defaultLayout,
      defaultTools: settings.defaultTools || [],
      autoLayout: settings.autoLayout ?? true,
      syncedTabs: settings.syncedTabs ?? true,
    });
  }, [settings, open]);
  
  // Handle default tools change
  const handleDefaultToolsChange = (tools: string[]) => {
    setTempSettings(prev => ({
      ...prev,
      defaultTools: tools
    }));
  };

  // Apply changes function
  const applyChanges = () => {
    // Update all settings through the context
    updateSettings({
      theme: tempSettings.theme,
      defaultLayout: tempSettings.defaultLayout,
      defaultTools: tempSettings.defaultTools,
      autoLayout: tempSettings.autoLayout,
      syncedTabs: tempSettings.syncedTabs,
    });

    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved successfully.",
      duration: 3000
    });

    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost"
          className={`w-full text-left justify-start font-normal transition-all duration-300 ${
            isCollapsed ? "justify-center p-0 h-10 w-10" : ""
          }`}
        >
          <Settings className={`h-4 w-4 shrink-0 ${!isCollapsed ? "mr-3" : ""}`} />
          {!isCollapsed && <span>Settings</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] max-w-[90vw] p-0">
        <div className="flex h-full flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure your application preferences
          </SheetDescription>
        </SheetHeader>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg mx-6">
          <Button
            variant={activeTab === 'general' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('general')}
            className="flex-1"
          >
            General
          </Button>
          <Button
            variant={activeTab === 'shortcuts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('shortcuts')}
            className="flex-1"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pr-2">
          {activeTab === 'general' ? (
            <>
              {/* Theme Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Theme</h3>
                <RadioGroup
                  value={tempSettings.theme}
                  onValueChange={(value) => {
                    const newTheme = value as 'light' | 'dark' | 'system';
                    setTempSettings({
                      ...tempSettings,
                      theme: newTheme
                    });
                  }}
                  className="flex items-center space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center">
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center">
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center">
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Auto Layout Toggle */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Auto Layout</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoLayout">Automatically expand layout when opening tools</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, layout grows to fit up to three panels as you open tools.
                    </p>
                  </div>
                  <Switch
                    id="autoLayout"
                    checked={tempSettings.autoLayout}
                    onCheckedChange={(checked) => setTempSettings(prev => ({ ...prev, autoLayout: checked }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Synced Tabs Toggle */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Tab Bar Mode</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="syncedTabs">Sync tab bar across all panels</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, all panels show the same tabs. When disabled, each panel has its own independent tabs.
                    </p>
                  </div>
                  <Switch
                    id="syncedTabs"
                    checked={tempSettings.syncedTabs}
                    onCheckedChange={(checked) => setTempSettings(prev => ({ ...prev, syncedTabs: checked }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Default Layout Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Default Layout</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  This layout will be applied when starting the application
                </p>
                
                {/* Fixed Select component with proper styling */}
                <div className="relative">
                  <Select
                    value={tempSettings.defaultLayout}
                    onValueChange={(value) => setTempSettings({
                      ...tempSettings,
                      defaultLayout: value as LayoutType
                    })}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select default layout" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50 w[calc(100%+10px)] -ml-1">
                      <SelectItem value="1" className="py-2.5 hover:bg-muted/50">Single Panel</SelectItem>
                      <SelectItem value="2" className="py-2.5 hover:bg-muted/50">Two Panels</SelectItem>
                      <SelectItem value="3" className="py-2.5 hover:bg-muted/50">Three Panels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Default Tools Settings */}
              <div className="space-y-4">
                <DefaultToolsSelector 
                  layout={tempSettings.defaultLayout} 
                  selectedTools={tempSettings.defaultTools}
                  onToolsChange={handleDefaultToolsChange}
                />
              </div>

              <Separator />

              {/* Autostart Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Startup</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autostart" className="flex items-center">
                      <Power className="w-4 h-4 mr-2" />
                      Start with Windows
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically start the app when Windows boots up
                    </p>
                  </div>
                  <Switch
                    key={`autostart-${settings.autostart}`}
                    id="autostart"
                    checked={settings.autostart || false}
                    onCheckedChange={async (checked) => {
                      try {
                        await setAutostart(checked);
                        toast({
                          title: checked ? "Autostart Enabled" : "Autostart Disabled",
                          description: checked 
                            ? "The app will start automatically with Windows." 
                            : "The app will no longer start automatically with Windows.",
                          duration: 3000
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update autostart setting.",
                          variant: "destructive",
                          duration: 3000
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Shortcuts Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetAllShortcuts();
                      toast({
                        title: "Shortcuts Reset",
                        description: "All shortcuts have been reset to defaults.",
                        duration: 2000
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset All
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {Object.entries(
                    shortcuts.reduce((acc, shortcut) => {
                      if (!acc[shortcut.category]) acc[shortcut.category] = [];
                      acc[shortcut.category].push(shortcut);
                      return acc;
                    }, {} as Record<string, typeof shortcuts>)
                  ).map(([category, categoryShortcuts]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
                        {category}
                      </h4>
                      <div className="space-y-1.5">
                        {categoryShortcuts.map((shortcut) => (
                          <div
                            key={shortcut.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{shortcut.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {shortcut.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {shortcut.keys.map((key) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}
                                  </Badge>
                                ))}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingShortcut(shortcut.id)}
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <SheetFooter className="p-4 px-6 border-t">
          {activeTab === 'general' && (
            <Button 
              onClick={applyChanges}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          )}
        </SheetFooter>
        </div>
      </SheetContent>
      
      {/* Shortcut Editor Dialog */}
      {editingShortcut && (
        <Dialog open={!!editingShortcut} onOpenChange={() => setEditingShortcut(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Shortcut</DialogTitle>
            </DialogHeader>
            <ShortcutEditor 
              shortcutId={editingShortcut} 
              onClose={() => setEditingShortcut(null)} 
            />
          </DialogContent>
        </Dialog>
      )}
    </Sheet>
  );
};