import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'bg-white dark:bg-slate-900 dark:text-slate-100',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-600',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
