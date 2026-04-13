import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import DraggableTaskCard from './DraggableTaskCard';
import TaskCard from './TaskCard';
import type { Task } from '../types';

const columnConfig: Record<Task['status'], { label: string; color: string; dot: string; dropHighlight: string }> = {
  todo: { label: 'To Do', color: 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700', dot: 'bg-slate-400', dropHighlight: 'ring-2 ring-slate-300 dark:ring-slate-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800', dot: 'bg-blue-500', dropHighlight: 'ring-2 ring-blue-300 dark:ring-blue-500' },
  done: { label: 'Done', color: 'bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800', dot: 'bg-green-500', dropHighlight: 'ring-2 ring-green-300 dark:ring-green-500' },
};

interface KanbanBoardProps {
  tasks: Task[];
  memberMap: Record<string, string>;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task['status'], projectId: string) => void;
  projectId: string;
}

function DroppableColumn({ status, children, isOver }: { status: string; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: status });
  const cfg = columnConfig[status as Task['status']];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 min-h-[200px] transition-all ${cfg.color} ${isOver ? cfg.dropHighlight : ''}`}
    >
      {children}
    </div>
  );
}

export default function KanbanBoard({ tasks, memberMap, onTaskClick, onStatusChange, projectId }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const statuses: Task['status'][] = ['todo', 'in_progress', 'done'];

  const columns = statuses.map((status) => ({
    key: status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }

    if (statuses.includes(over.id as Task['status'])) {
      setOverColumn(over.id as string);
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) setOverColumn(overTask.status);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over) return;

    let targetStatus: Task['status'] | null = null;

    if (statuses.includes(over.id as Task['status'])) {
      targetStatus = over.id as Task['status'];
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask || draggedTask.status === targetStatus) return;

    onStatusChange(draggedTask.id, targetStatus, projectId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((col) => {
          const cfg = columnConfig[col.key];
          const taskIds = col.tasks.map((t) => t.id);

          return (
            <DroppableColumn key={col.key} status={col.key} isOver={overColumn === col.key}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{cfg.label}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">{col.tasks.length}</span>
              </div>
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {col.tasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      assigneeName={task.assignee_id ? memberMap[task.assignee_id] : undefined}
                    />
                  ))}
                </div>
              </SortableContext>
              {col.tasks.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  Drop tasks here
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 shadow-lg">
            <TaskCard
              task={activeTask}
              onClick={() => {}}
              assigneeName={activeTask.assignee_id ? memberMap[activeTask.assignee_id] : undefined}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
