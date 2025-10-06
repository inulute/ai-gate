// src/components/forms/AddToolForm.tsx
import { useState, useRef } from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bot, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// A simple helper that constructs a favicon URL from a site URL
const getFaviconUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch {
    return null;
  }
};

interface AddToolFormProps {
  onClose?: () => void;
}

export const AddToolForm = ({ onClose }: AddToolFormProps) => {
  const { addTool, tools } = useAITools();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTool, setNewTool] = useState({
    name: '',
    url: '',
    type: 'webview' as const,
    description: '',
    icon: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate URL (ignoring case)
    const newToolUrlLower = newTool.url.trim().toLowerCase();
    const duplicate = tools.find(
      tool => tool.url.trim().toLowerCase() === newToolUrlLower
    );
    if (duplicate) {
      toast({
        title: "Tool already exists",
        description: "A tool with this URL has already been added.",
        variant: "destructive",
      });
      return;
    }

    try {
      const urlObj = new URL(newTool.url);
      // Use the current icon if available, otherwise fallback to Google's favicon service
      const finalIcon =
        newTool.icon ||
        `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

      addTool({
        ...newTool,
        id: Date.now().toString(),
        icon: finalIcon,
      });
      
      // Reset the form
      setNewTool({
        name: '',
        url: '',
        type: 'webview',
        description: '',
        icon: '',
      });

      onClose?.();
    } catch (error) {
      console.error('Invalid URL:', error);
    }
  };

  // Update URL, derive a suggested name, and immediately update the icon preview
  const handleUrlChange = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const suggestedName = !newTool.name
        ? hostname.replace(/^www\./, '').split('.')[0]
        : newTool.name;
      const faviconUrl = getFaviconUrl(url);
      setNewTool(prev => ({
        ...prev,
        url,
        name: suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1),
        icon: faviconUrl || prev.icon,
      }));
    } catch {
      // If URL is invalid, just update the URL field
      setNewTool(prev => ({ ...prev, url }));
    }
  };

  const handleNameChange = (name: string) => {
    setNewTool(prev => ({ ...prev, name }));
  };

  const handleDescriptionChange = (description: string) => {
    setNewTool(prev => ({ ...prev, description }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNewTool(prev => ({ ...prev, icon: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4">
        <div className="relative group">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {newTool.icon ? (
              <img 
                src={newTool.icon} 
                alt="Icon preview" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  // If the favicon fails to load, clear it so the default icon shows
                  e.currentTarget.src = '';
                  setNewTool(prev => ({ ...prev, icon: '' }));
                }}
              />
            ) : (
              <Bot className="w-6 h-6" />
            )}
            <div 
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 text-white" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        <Input
          placeholder="Tool Name"
          value={newTool.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="bg-background flex-1"
          required
        />
      </div>

      <Input
        placeholder="URL"
        value={newTool.url}
        onChange={(e) => handleUrlChange(e.target.value)}
        className="bg-background"
        required
      />

      <Input
        placeholder="Description (optional)"
        value={newTool.description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        className="bg-background"
      />

      <Button type="submit" className="w-full">Add Tool</Button>
    </form>
  );
};
