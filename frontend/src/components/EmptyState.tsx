import { type ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, message, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-slate-300 dark:text-slate-600">{icon || <FolderOpen size={48} strokeWidth={1.5} />}</div>
      <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-1">{message}</p>
      {description && <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {action}
    </div>
  );
}
