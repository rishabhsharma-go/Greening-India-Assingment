import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, ListTodo, X } from 'lucide-react';
import { useProject, useProjectMembers, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskForm from '../components/TaskForm';
import ProjectForm from '../components/ProjectForm';
import EmptyState from '../components/EmptyState';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { Task } from '../types';


export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id!);
  const { data: membersData } = useProjectMembers(id!);
  const members = membersData?.members || [];

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.id] = m.name;
    return map;
  }, [members]);

  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const assigneeFilter = searchParams.get('assignee') || '';
  const hasFilters = statusFilter || priorityFilter || assigneeFilter;

  function setFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function clearFilters() {
    setSearchParams({});
  }

  const filters = {
    ...(statusFilter && { status: statusFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
    ...(assigneeFilter && { assignee_id: assigneeFilter }),
  };

  const { data: tasksData, isLoading: tasksLoading } = useTasks(id!, Object.keys(filters).length ? filters : undefined);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateProject = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [showTaskCreate, setShowTaskCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  const tasks = tasksData?.tasks || [];
  const isOwner = project?.owner_id === user?.id;

  if (projectLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 dark:text-red-400 mb-4">Failed to load project.</p>
        <Button variant="secondary" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  function handleDeleteProject() {
    deleteProjectMutation.mutate(id!, {
      onSuccess: () => navigate('/projects'),
    });
  }

  function handleDeleteTask() {
    if (!confirmDeleteTaskId) return;
    deleteTask.mutate({ id: confirmDeleteTaskId, projectId: id! }, {
      onSuccess: () => {
        setConfirmDeleteTaskId(null);
        setEditingTask(null);
      },
    });
  }

  function handleStatusChange(taskId: string, newStatus: Task['status'], projectId: string) {
    updateTask.mutate({ id: taskId, project_id: projectId, status: newStatus });
  }

  return (
    <div>
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowEditProject(true)}>
                <Pencil size={14} />
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmDeleteProject(true)}>
                <Trash2 size={14} />
                Delete
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setShowTaskCreate(true)}>
            <Plus size={16} />
            Add Task
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <Select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setFilter('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
            <Select
              label="Assignee"
              value={assigneeFilter}
              onChange={(e) => setFilter('assignee', e.target.value)}
            >
              <option value="">All Assignees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors whitespace-nowrap"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {tasksLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-6 h-6" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={48} strokeWidth={1.5} />}
          message={hasFilters ? 'No tasks match your filters' : 'No tasks in this project'}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            ) : (
              <Button onClick={() => setShowTaskCreate(true)}>
                <Plus size={16} />
                Add a task
              </Button>
            )
          }
        />
      ) : (
        <KanbanBoard
          tasks={tasks}
          memberMap={memberMap}
          onTaskClick={(task) => setEditingTask(task)}
          onStatusChange={handleStatusChange}
          projectId={id!}
        />
      )}

      <Modal open={showTaskCreate} onClose={() => setShowTaskCreate(false)} title="New Task">
        <TaskForm
          loading={createTask.isPending}
          members={members}
          onSubmit={(data) => {
            createTask.mutate(
              { projectId: id!, ...data },
              { onSuccess: () => setShowTaskCreate(false) }
            );
          }}
        />
      </Modal>

      <Modal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <>
            <TaskForm
              initial={editingTask}
              loading={updateTask.isPending}
              members={members}
              onSubmit={(data) => {
                updateTask.mutate(
                  { id: editingTask.id, project_id: id!, ...data },
                  { onSuccess: () => setEditingTask(null) }
                );
              }}
            />
            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDeleteTaskId(editingTask.id)}
              >
                <Trash2 size={14} />
                Delete Task
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Edit Project">
        <ProjectForm
          initial={project}
          loading={updateProject.isPending}
          onSubmit={(data) => {
            updateProject.mutate(
              { id: id!, ...data },
              { onSuccess: () => setShowEditProject(false) }
            );
          }}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDeleteProject}
        title="Delete project"
        message="This will permanently delete this project and all its tasks. This action cannot be undone."
        confirmLabel="Delete Project"
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmDeleteProject(false)}
        loading={deleteProjectMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmDeleteTaskId}
        title="Delete task"
        message="This will permanently delete this task. This action cannot be undone."
        confirmLabel="Delete Task"
        onConfirm={handleDeleteTask}
        onCancel={() => setConfirmDeleteTaskId(null)}
        loading={deleteTask.isPending}
      />
    </div>
  );
}
