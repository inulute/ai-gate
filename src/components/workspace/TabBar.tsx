// src/components/workspace/TabBar.tsx
import { ToolInstance } from '@/types/AITool';
import { useAITools } from '@/context/AIToolsContext';
import { Tab } from './Tab';
import { ToolPicker } from './ToolPicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

interface TabBarProps {
  panelId: number;
  instances: ToolInstance[];
  activeInstanceId: string | undefined;
}

export const TabBar = ({ panelId, instances, activeInstanceId }: TabBarProps) => {
  const { closeToolInstance, reorderTabInPanel, getToolById } = useAITools();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = instances.findIndex(inst => inst.id === active.id);
      const newIndex = instances.findIndex(inst => inst.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTabInPanel(panelId, oldIndex, newIndex);
      }
    }
  };

  return (
    <div className="flex items-center bg-secondary/20 border-b border-border">
      {/* Horizontal Scrollable Tab Container */}
      <div className="flex-1 flex overflow-x-auto scrollbar-thin">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={instances.map(inst => inst.id)}
            strategy={horizontalListSortingStrategy}
          >
            {instances.map((instance) => {
              const tool = getToolById(instance.toolId);
              if (!tool) return null;

              return (
                <Tab
                  key={instance.id}
                  instance={instance}
                  tool={tool}
                  isActive={instance.id === activeInstanceId}
                  onClose={() => closeToolInstance(instance.id)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Add Tab Button - Tool Picker */}
      <ToolPicker panelId={panelId} />
    </div>
  );
};
