// src/components/workspace/WorkspaceGrid.tsx
import { useAITools } from '@/context/AIToolsContext';
import { AIToolView } from './AIToolView';
import { LayoutType } from '@/types/AITool';

export const WorkspaceGrid = () => {
  const { toolInstances, layout, getToolById } = useAITools();

  const gridCols: Record<LayoutType, string> = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3'
  };

  const shouldShowOnlyRecent = layout === '1';
  
  const visibleInstances = shouldShowOnlyRecent
    ? toolInstances
        .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
        .slice(0, 1)
    : toolInstances
        .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
        .slice(0, parseInt(layout));
  
  const visibleInstanceIds = new Set(visibleInstances.map(i => i.id));
  
  const layoutNumber = parseInt(layout);
  const emptySlots = Math.max(0, layoutNumber - visibleInstances.length);

  return (
    <div 
      className={`grid ${gridCols[layout]} gap-4 h-full p-4`}
      style={{
        transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        gridTemplateColumns: layout === '1' ? '1fr' : layout === '2' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
      }}
    >
      {[...toolInstances]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((instance) => {
          const tool = getToolById(instance.toolId);
          if (!tool) return null;
          
          const isVisible = visibleInstanceIds.has(instance.id);
          
          return (
            <div 
              key={instance.id}
              className="w-full h-full"
              style={
                isVisible
                  ? {
                      gridColumn: 'auto',
                    }
                  : {
                      position: 'fixed',
                      left: '-99999px',
                      top: 0,
                      width: '800px',
                      height: '600px',
                      pointerEvents: 'none',
                      gridColumn: 'auto',
                    }
              }
            >
              <AIToolView
                tool={tool}
                instance={instance}
                isVisible={isVisible}
              />
            </div>
          );
        })}
      
      {visibleInstances.length === 0 ? (
        <div 
          className="border border-border rounded-lg flex items-center justify-center text-muted-foreground bg-secondary/50 dark:bg-secondary/20"
          style={{ gridColumn: '1 / -1', minHeight: '200px' }}
        >
          Select an AI tool from sidebar
        </div>
      ) : (
        Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="border border-border rounded-lg flex items-center justify-center text-muted-foreground bg-secondary/50 dark:bg-secondary/20"
          style={{ 
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Select an AI tool from sidebar
        </div>
        ))
      )}
    </div>
  );
};