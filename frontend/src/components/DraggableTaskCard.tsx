import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import TaskCard from './TaskCard';
import type { Task } from '../types';

interface DraggableTaskCardProps {
  task: Task;
  onClick: () => void;
  assigneeName?: string;
}

export default function DraggableTaskCard({ task, onClick, assigneeName }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-opacity z-10"
      >
        <GripVertical size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      <TaskCard task={task} onClick={onClick} assigneeName={assigneeName} />
    </div>
  );
}
