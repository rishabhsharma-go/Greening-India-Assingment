import { cn } from '../../lib/utils';

export default function Spinner({ className }: { className?: string }) {
  return <div className={cn('spinner', className)} />;
}
