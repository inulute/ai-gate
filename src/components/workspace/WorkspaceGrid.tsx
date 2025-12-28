// src/components/workspace/WorkspaceGrid.tsx
import { useAITools } from '@/context/AIToolsContext';
import { Panel } from './Panel';
import { LayoutType } from '@/types/AITool';

export const WorkspaceGrid = () => {
  const { layout } = useAITools();

  const gridCols: Record<LayoutType, string> = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3'
  };

  const layoutNumber = parseInt(layout);
  const panels = Array.from({ length: layoutNumber }, (_, i) => i);

  return (
    <div
      className={`grid ${gridCols[layout]} gap-4 h-full p-4`}
      style={{
        transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        gridTemplateColumns: layout === '1' ? '1fr' : layout === '2' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
      }}
    >
      {panels.map((panelId) => (
        <Panel key={panelId} panelId={panelId} />
      ))}
    </div>
  );
};