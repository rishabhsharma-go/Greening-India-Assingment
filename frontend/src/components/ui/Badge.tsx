import { cn } from '../../lib/utils';

const statusStyles: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

interface BadgeProps {
  type: 'status' | 'priority';
  value: string;
  className?: string;
}

export default function Badge({ type, value, className }: BadgeProps) {
  const styles = type === 'status' ? statusStyles : priorityStyles;
  const label = type === 'status' ? statusLabels[value] || value : value;

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', styles[value], className)}>
      {label}
    </span>
  );
}
