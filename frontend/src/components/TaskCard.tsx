import { Calendar, User } from 'lucide-react';
import Badge from './ui/Badge';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  assigneeName?: string;
}

function isOverdue(date: string) {
  return new Date(date).getTime() < Date.now();
}

export default function TaskCard({ task, onClick, assigneeName }: TaskCardProps) {
  const overdue = task.due_date && task.status !== 'done' && isOverdue(task.due_date);

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {task.title}
        </h4>
        <Badge type="priority" value={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              <Calendar size={12} />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
          <User size={12} className="shrink-0" />
          {assigneeName || (task.assignee_id ? 'Assigned' : 'Unassigned')}
        </span>
      </div>
    </div>
  );
}
