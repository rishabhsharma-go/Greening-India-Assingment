import { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import { tasksApi, usersApi } from '../api/tasks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee_id: '',
  due_date: '',
};

export default function TaskModal({ isOpen, onClose, projectId, task, onSaved }) {
  const isEditing = Boolean(task);
  const { user } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setForm({
          title: task.title ?? '',
          description: task.description ?? '',
          status: task.status ?? 'todo',
          priority: task.priority ?? 'medium',
          assignee_id: task.assignee_id ?? '',
          due_date: task.due_date ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [isOpen, task]);

  // Fetch users for assignee picker
  useEffect(() => {
    if (!isOpen) return;
    setLoadingUsers(true);
    usersApi
      .list()
      .then((data) => setUsers(data?.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        ...(isEditing ? { status: form.status } : {}),
      };

      let saved;
      if (isEditing) {
        saved = await tasksApi.update(task.id, payload);
      } else {
        saved = await tasksApi.create(projectId, payload);
      }

      addToast(isEditing ? 'Task updated' : 'Task created', 'success');
      onSaved(saved, isEditing);
      onClose();
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      } else {
        addToast(err.message ?? 'Something went wrong', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function assignToMe() {
    setForm((prev) => ({ ...prev, assignee_id: user?.id ?? '' }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Task' : 'New Task'}>
      <form id="task-form" onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="form-group">
          <label htmlFor="task-title" className="form-label">
            Title <span className="form-required">*</span>
          </label>
          <input
            id="task-title"
            name="title"
            type="text"
            className={`form-input${errors.title ? ' form-input--error' : ''}`}
            value={form.title}
            onChange={handleChange}
            placeholder="What needs to be done?"
            autoFocus
            maxLength={200}
          />
          {errors.title && <p className="form-error">{errors.title}</p>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="task-description" className="form-label">
            Description
          </label>
          <textarea
            id="task-description"
            name="description"
            className="form-input form-textarea"
            value={form.description}
            onChange={handleChange}
            placeholder="Add more context…"
            rows={3}
            maxLength={1000}
          />
        </div>

        {/* Row: Priority + Status (edit only) */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-priority" className="form-label">Priority</label>
            <select
              id="task-priority"
              name="priority"
              className="form-input form-select"
              value={form.priority}
              onChange={handleChange}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div className="form-group">
              <label htmlFor="task-status" className="form-label">Status</label>
              <select
                id="task-status"
                name="status"
                className="form-input form-select"
                value={form.status}
                onChange={handleChange}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="task-assignee" className="form-label">Assignee</label>
            <button
              type="button"
              className="form-link-btn"
              onClick={assignToMe}
            >
              Assign to me
            </button>
          </div>
          {loadingUsers ? (
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LoadingSpinner size="sm" label="Loading members…" />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
            </div>
          ) : (
            <select
              id="task-assignee"
              name="assignee_id"
              className="form-input form-select"
              value={form.assignee_id}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Due date */}
        <div className="form-group">
          <label htmlFor="task-due-date" className="form-label">Due Date</label>
          <input
            id="task-due-date"
            name="due_date"
            type="date"
            className="form-input"
            value={form.due_date}
            onChange={handleChange}
          />
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            id={isEditing ? 'save-task-btn' : 'create-task-btn'}
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner size="sm" label="Saving…" /> : isEditing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
