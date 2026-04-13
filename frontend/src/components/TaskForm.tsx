import { useState, useEffect, useRef, type FormEvent } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { searchUsers, type UserSearchResult } from '../api/users';
import type { Task } from '../types';

interface TaskFormProps {
  initial?: Task;
  onSubmit: (data: Partial<Task>) => void;
  loading?: boolean;
  members?: { id: string; name: string }[];
}

export default function TaskForm({ initial, onSubmit, loading, members = [] }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status, setStatus] = useState<Task['status']>(initial?.status || 'todo');
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority || 'medium');
  const [assigneeId, setAssigneeId] = useState(initial?.assignee_id || '');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState(initial?.due_date?.split('T')[0] || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial?.assignee_id) {
      const member = members.find((m) => m.id === initial.assignee_id);
      if (member) setAssigneeName(member.name);
    }
  }, [initial, members]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      setShowDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectAssignee(user: UserSearchResult) {
    setAssigneeId(user.id);
    setAssigneeName(user.name);
    setSearchQuery('');
    setShowDropdown(false);
  }

  function clearAssignee() {
    setAssigneeId('');
    setAssigneeName('');
    setSearchQuery('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        placeholder="Task title"
      />
      <div className="space-y-1">
        <label htmlFor="task-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe the task..."
          className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {initial && (
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </Select>
        )}
        <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </div>

      <div className="space-y-1" ref={dropdownRef}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assignee</label>
        {assigneeId ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900">
            <span className="text-slate-900 dark:text-slate-100">{assigneeName}</span>
            <button
              type="button"
              onClick={clearAssignee}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search users by name or email..."
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectAssignee(u)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors"
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">{u.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-3 text-sm text-slate-400 dark:text-slate-500">
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      <Input
        label="Due Date"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
