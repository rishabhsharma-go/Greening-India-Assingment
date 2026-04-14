import { useState, type FormEvent } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Project } from '../types';

interface ProjectFormProps {
  initial?: Project;
  onSubmit: (data: { name: string; description: string }) => void;
  loading?: boolean;
}

export default function ProjectForm({ initial, onSubmit, loading }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="My Project"
      />
      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What's this project about?"
          className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
