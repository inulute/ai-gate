// src/components/forms/EditToolForm.tsx
import { useState, useRef, useEffect } from 'react';
import { useAITools } from '@/context/AIToolsContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bot, Upload } from 'lucide-react';
import { type AITool } from '@/types/AITool';
import { getFaviconUrl } from '@/lib/favicon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditToolFormProps {
  tool: AITool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditToolForm = ({ tool, open, onOpenChange }: EditToolFormProps) => {
  const { updateTool } = useAITools();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editedTool, setEditedTool] = useState<AITool>(tool);
  // Tracks whether the icon is user-uploaded (data URI)
  const [isCustomIcon, setIsCustomIcon] = useState(tool.icon.startsWith('data:'));

  useEffect(() => {
    if (!editedTool.url || isCustomIcon) return;

    (async () => {
      try {
        const urlObj = new URL(editedTool.url);
        // Fallback icon from Google (if we can't fetch the main favicon)
        const googleIcon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

        // Attempt to get a direct favicon URL (depends on how your getFaviconUrl is implemented)
        const possibleFavicon = getFaviconUrl(editedTool.url);

        if (!possibleFavicon) {
          // If getFaviconUrl returns null/undefined, just fallback to Google
          setEditedTool(prev => ({ ...prev, icon: googleIcon }));
          return;
        }

        // Optionally, do a quick fetch to see if possibleFavicon is valid
        const response = await fetch(possibleFavicon);
        if (response.ok) {
          setEditedTool(prev => ({ ...prev, icon: possibleFavicon }));
        } else {
          // If the favicon doesn’t exist or returns 404, use Google
          setEditedTool(prev => ({ ...prev, icon: googleIcon }));
        }
      } catch (error) {
        console.error('Error fetching favicon:', error);
      }
    })();
  }, [editedTool.url, isCustomIcon]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTool(editedTool);
    onOpenChange(false);
  };

  // If the user changes the URL, reset any custom icon usage
  // so we can re-fetch a new icon
  const handleUrlChange = (url: string) => {
    setEditedTool(prev => ({ ...prev, url }));
    setIsCustomIcon(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditedTool(prev => ({ ...prev, icon: result }));
        setIsCustomIcon(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit AI Tool</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            {/* Icon Preview */}
            <div className="relative group">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                <img
                  src={editedTool.icon}
                  alt="Tool icon"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <Bot className="w-6 h-6 hidden absolute inset-0 m-auto" />
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

            {/* Tool Name */}
            <Input
              placeholder="Tool Name"
              value={editedTool.name}
              onChange={e =>
                setEditedTool(prev => ({ ...prev, name: e.target.value }))
              }
              className="bg-background flex-1"
              required
            />
          </div>

          {/* URL */}
          <Input
            placeholder="URL"
            value={editedTool.url}
            onChange={e => handleUrlChange(e.target.value)}
            className="bg-background"
            required
          />

          {/* Description */}
          <Input
            placeholder="Description (optional)"
            value={editedTool.description || ''}
            onChange={e =>
              setEditedTool(prev => ({ ...prev, description: e.target.value }))
            }
            className="bg-background"
          />

          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
