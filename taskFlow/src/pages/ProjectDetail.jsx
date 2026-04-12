import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsApi } from '../api/projects.js';
import { tasksApi, usersApi } from '../api/tasks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageLoader } from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import TaskModal from '../components/TaskModal.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  todo: { label: 'To Do', cls: 'badge--todo' },
  in_progress: { label: 'In Progress', cls: 'badge--in-progress' },
  done: { label: 'Done', cls: 'badge--done' },
};

const PRIORITY_META = {
  low: { label: 'Low', cls: 'priority--low' },
  medium: { label: 'Medium', cls: 'priority--medium' },
  high: { label: 'High', cls: 'priority--high' },
};

const STATUS_CYCLE = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

function formatDue(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const isOverdue = d < now;
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, isOverdue };
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({ task, users, onEdit, onDelete, onStatusChange, statusChanging }) {
  const statusMeta = STATUS_META[task.status] ?? STATUS_META.todo;
  const priorityMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const due = formatDue(task.due_date);
  const assignee = task.assignee_id ? users.find((u) => u.id === task.assignee_id) : null;
  const isChanging = statusChanging === task.id;

  return (
    <div className="task-row" role="listitem">
      {/* Priority indicator */}
      <div className={`task-row__priority ${priorityMeta.cls}`} title={`Priority: ${priorityMeta.label}`} aria-label={`${priorityMeta.label} priority`} />

      {/* Main content */}
      <div className="task-row__content">
        <div className="task-row__top">
          <button
            className="task-row__title"
            onClick={() => onEdit(task)}
            aria-label={`Edit task: ${task.title}`}
            id={`task-title-${task.id}`}
          >
            {task.title}
          </button>

          <div className="task-row__badges">
            <span className={`badge ${priorityMeta.cls}-badge`}>{priorityMeta.label}</span>
          </div>
        </div>

        <div className="task-row__meta">
          {/* Status badge — clickable for optimistic update */}
          <button
            className={`badge badge--status ${statusMeta.cls}${isChanging ? ' badge--loading' : ''}`}
            onClick={() => !isChanging && onStatusChange(task.id, task.status)}
            title="Click to advance status"
            aria-label={`Status: ${statusMeta.label}. Click to advance.`}
            id={`task-status-${task.id}`}
            disabled={isChanging}
          >
            {isChanging ? '…' : statusMeta.label}
          </button>

          {/* Assignee */}
          {assignee ? (
            <span className="task-row__assignee" title={`Assigned to ${assignee.name}`}>
              <span className="task-row__avatar">{assignee.name.charAt(0)}</span>
              <span className="task-row__assignee-name">{assignee.name}</span>
            </span>
          ) : (
            <span className="task-row__unassigned">Unassigned</span>
          )}

          {/* Due date */}
          {due && (
            <span className={`task-row__due${due.isOverdue ? ' task-row__due--overdue' : ''}`}>
              {due.isOverdue ? '⚠ ' : '📅 '}{due.label}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="task-row__actions">
        <button
          className="btn btn--icon"
          id={`edit-task-${task.id}`}
          onClick={() => onEdit(task)}
          title="Edit task"
          aria-label={`Edit: ${task.title}`}
        >
          ✎
        </button>
        <button
          className="btn btn--icon btn--danger-ghost"
          id={`delete-task-${task.id}`}
          onClick={() => onDelete(task)}
          title="Delete task"
          aria-label={`Delete: ${task.title}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── ProjectDetail ────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [statusChanging, setStatusChanging] = useState(null); // task id being optimistically updated

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([projectsApi.get(projectId), usersApi.list()])
      .then(([projData, usersData]) => {
        if (cancelled) return;
        setProject({ id: projData.id, name: projData.name, description: projData.description, owner_id: projData.owner_id, created_at: projData.created_at });
        setTasks(projData.tasks ?? []);
        setUsers(usersData?.users ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404) {
          setError('Project not found.');
        } else {
          setError(err.message ?? 'Failed to load project');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [projectId]);

  // ── Filtered tasks (client-side) ────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (assigneeFilter && t.assignee_id !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  // ── Task stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, done: 0 };
    tasks.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return counts;
  }, [tasks]);

  // ── Optimistic status change ────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (taskId, currentStatus) => {
      const nextStatus = STATUS_CYCLE[currentStatus];
      const previousTasks = tasks; // capture snapshot

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      setStatusChanging(taskId);

      try {
        const updated = await tasksApi.update(taskId, { status: nextStatus });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch (err) {
        // Revert
        setTasks(previousTasks);
        addToast('Failed to update status — reverted', 'error');
      } finally {
        setStatusChanging(null);
      }
    },
    [tasks, addToast]
  );

  // ── Task CRUD ───────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  function handleTaskSaved(saved, wasEditing) {
    if (wasEditing) {
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTasks((prev) => [...prev, saved]);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    // Optimistic removal
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== task.id));

    try {
      await tasksApi.delete(task.id);
      addToast('Task deleted', 'success');
    } catch (err) {
      setTasks(prev);
      addToast(err.message ?? 'Failed to delete task', 'error');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert" style={{ marginTop: 32 }}>
          {error}
        </div>
        <button className="btn btn--ghost" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          ← Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="page project-detail-page">
      {/* Breadcrumb / back */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb__link">Projects</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span className="breadcrumb__current">{project?.name}</span>
      </nav>

      {/* Project header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{project?.name}</h1>
          {project?.description && (
            <p className="page-subtitle">{project.description}</p>
          )}
        </div>
        <button id="new-task-btn" className="btn btn--primary" onClick={openCreate}>
          <span aria-hidden="true">+</span> New Task
        </button>
      </div>

      {/* Stats bar */}
      <div className="stats-bar" role="region" aria-label="Task statistics">
        <div className="stat-chip stat-chip--todo">
          <span className="stat-chip__count">{stats.todo}</span>
          <span className="stat-chip__label">To Do</span>
        </div>
        <div className="stat-chip stat-chip--in-progress">
          <span className="stat-chip__count">{stats.in_progress}</span>
          <span className="stat-chip__label">In Progress</span>
        </div>
        <div className="stat-chip stat-chip--done">
          <span className="stat-chip__count">{stats.done}</span>
          <span className="stat-chip__label">Done</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__count">{tasks.length}</span>
          <span className="stat-chip__label">Total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" role="toolbar" aria-label="Task filters">
        {/* Status tabs */}
        <div className="filter-tabs" role="tablist" aria-label="Filter by status">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={`filter-tab${statusFilter === tab.value ? ' filter-tab--active' : ''}`}
              id={`filter-tab-${tab.value || 'all'}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assignee filter */}
        <select
          id="assignee-filter"
          className="form-input form-select filter-select"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="">All assignees</option>
          <option value={user?.id}>Assigned to me</option>
          {users
            .filter((u) => u.id !== user?.id)
            .map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
        </select>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={statusFilter || assigneeFilter ? '🔍' : '✅'}
          title={
            statusFilter || assigneeFilter
              ? 'No tasks match these filters'
              : 'No tasks yet'
          }
          description={
            statusFilter || assigneeFilter
              ? 'Try adjusting your filters to see more tasks.'
              : 'Add your first task to start tracking work.'
          }
          action={
            !statusFilter && !assigneeFilter ? (
              <button className="btn btn--primary" onClick={openCreate}>
                Add first task
              </button>
            ) : (
              <button
                className="btn btn--ghost"
                onClick={() => { setStatusFilter(''); setAssigneeFilter(''); }}
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <div className="task-list" role="list" aria-label="Tasks">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              users={users}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              statusChanging={statusChanging}
            />
          ))}
        </div>
      )}

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        projectId={projectId}
        task={editingTask}
        onSaved={handleTaskSaved}
      />
    </div>
  );
}
