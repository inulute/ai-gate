// src/components/layout/LayoutSelector.tsx
import { useAITools } from '@/context/AIToolsContext';
import { Button } from '@/components/ui/button';
import { LayoutType } from '@/types/AITool';
import { Layout, LayoutList, LayoutGrid } from 'lucide-react';


export const LayoutSelector = () => {
  const { layout, setLayout } = useAITools();

  const layouts: { value: LayoutType; icon: React.ReactNode }[] = [
    { value: '1', icon: <Layout className="h-4 w-4" /> },
    { value: '2', icon: <LayoutList className="h-4 w-4" /> },
    { value: '3', icon: <LayoutGrid className="h-4 w-4" /> },
  ];

  return (
    <div className="flex gap-2">
      {layouts.map(({ value, icon }) => (
        <Button
          key={value}
          variant={layout === value ? 'secondary' : 'outline'}
          className="flex-1 hover:bg-secondary/80"
          onClick={() => setLayout(value)}
          size="sm"
        >
          {icon}
        </Button>
      ))}
    </div>
  );
};