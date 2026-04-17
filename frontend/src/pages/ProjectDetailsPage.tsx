import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  apiCreateTask,
  apiDeleteProject,
  apiDeleteTask,
  apiGetProjectDetails,
  apiGetProjectTaskIds,
  apiGetTask,
  apiGetUserName,
  apiLookupUserIdByName,
  apiPatchProject,
  apiPatchTask
} from '../lib/api';
import { STATUS_OPTIONS } from '../lib/constants';
import { formatDate, formatDateTime } from '../lib/format';
import type { ProjectDetailsResponseDto, TaskDetailDto, TaskRequestDto } from '../lib/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { ProjectDialog } from '../components/ProjectDialog';
import { TaskDialog, type TaskFormValue } from '../components/TaskDialog';
import { TaskDrawer } from '../components/TaskDrawer';

type FullTask = TaskDetailDto & {
  id: string;
  assigneeName: string;
};

async function loadFullTasks(projectId: string, status?: string) {
  const ids = await apiGetProjectTaskIds(projectId, status ? { status } : {});
  const results = await Promise.all(
    ids.map(async ({ id }) => {
      const task = await apiGetTask(id);
      let assigneeName = 'Unassigned';

      if (task.assignee_id) {
        try {
          assigneeName = await apiGetUserName(task.assignee_id);
        } catch {
          assigneeName = task.assignee_id;
        }
      }

      return { ...task, id, assigneeName };
    })
  );
  return results;
}

export function ProjectDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const projectId = id ?? '';

  const [project, setProject] = useState<ProjectDetailsResponseDto | null>(null);
  const [allTasks, setAllTasks] = useState<FullTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', assignee: '' });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: FullTask | null }>({
    open: false,
    task: null
  });

  const loadProject = async (status = filters.status) => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const details = await apiGetProjectDetails(projectId);
      setProject(details);
      const tasks = await loadFullTasks(projectId, status);
      setAllTasks(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const refreshTasks = async () => {
    if (!projectId) return;

    try {
      setTaskLoading(true);
      const tasks = await loadFullTasks(projectId, filters.status);
      setAllTasks(tasks);
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const state = location.state as { newlyCreatedTaskId?: string } | null;
    if (state?.newlyCreatedTaskId) {
      setSelectedTaskId(state.newlyCreatedTaskId);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const visibleTasks = useMemo(() => {
    const assigneeFilter = filters.assignee.trim().toLowerCase();
    return allTasks.filter((task: FullTask) => {
      const matchesAssignee =
        !assigneeFilter ||
        task.assigneeName.toLowerCase().includes(assigneeFilter) ||
        task.assignee_id.toLowerCase().includes(assigneeFilter);
      return matchesAssignee;
    });
  }, [allTasks, filters.assignee]);

  const createTask = async (payload: TaskFormValue) => {
    if (!projectId) return;

    const taskPayload: TaskRequestDto = {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      due_date: payload.due_date
    };

    const created = await apiCreateTask(projectId, taskPayload);

    if (payload.assigneeName?.trim()) {
      const assigneeId = await apiLookupUserIdByName(payload.assigneeName);
      if (assigneeId) {
        await apiPatchTask(created.id, { assignee: assigneeId });
      }
    }

    await refreshTasks();
    setSelectedTaskId(created.id);
  };

  const updateProject = async (payload: { name: string; description: string }) => {
    if (!projectId) return;
    await apiPatchProject(projectId, payload);
    await loadProject();
  };

  const deleteProject = async () => {
    if (!projectId) return;
    await apiDeleteProject(projectId);
    navigate('/projects', { replace: true });
  };

  const deleteTask = async (taskId: string) => {
    await apiDeleteTask(taskId);
    setDeleteTaskId(null);
    await refreshTasks();
  };

  return (
    <Stack spacing={3}>
      {loading ? (
        <LoadingBlock label="Loading project..." />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : project ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'start' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {project.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {project.description || 'No description'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created {formatDateTime(project.created_at)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateTaskOpen(true)}>
                Create task
              </Button>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setProjectDialogOpen(true)}>
                Update project
              </Button>
              <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => setDeleteProjectOpen(true)}>
                Delete project
              </Button>
            </Stack>
          </Box>

          <Card sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Filters
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Status"
                  value={filters.status}
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    const nextStatus = e.target.value;
                    setFilters((prev) => ({ ...prev, status: nextStatus }));
                    setTaskLoading(true);
                    try {
                      const tasks = await loadFullTasks(projectId, nextStatus);
                      setAllTasks(tasks);
                    } finally {
                      setTaskLoading(false);
                    }
                  }}
                  fullWidth
                >
                  <MenuItem value="">All</MenuItem>
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Assignee name or id"
                  value={filters.assignee}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters((prev) => ({ ...prev, assignee: e.target.value }))}
                  fullWidth
                />
              </Stack>
            </Stack>
          </Card>

          {taskLoading ? <LoadingBlock label="Refreshing tasks..." /> : null}

          {visibleTasks.length === 0 ? (
            <EmptyState title="No tasks yet" message="click create task to create a new task" />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 2
              }}
            >
              {visibleTasks.map((task: FullTask) => (
                <Card key={task.id} variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea sx={{ height: '100%', alignItems: 'stretch' }} onClick={() => setSelectedTaskId(task.id)}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {task.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48 }}>
                          {task.description || 'No description'}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip size="small" label={task.status} />
                          <Chip size="small" label={task.priority} variant="outlined" />
                          <Chip size="small" label={task.assigneeName} variant="outlined" />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Due {formatDate(task.due_date)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>

                  <Stack direction="row" spacing={1} sx={{ p: 2, pt: 0 }}>
                    <Button size="small" onClick={() => setTaskDialog({ open: true, task })}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTaskId(task.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Box>
          )}
        </>
      ) : null}

      <ProjectDialog
        open={projectDialogOpen}
        title="Update project"
        submitLabel="Save"
        initialValue={project ?? undefined}
        onClose={() => setProjectDialogOpen(false)}
        onSubmit={updateProject}
      />

      <TaskDialog
        open={createTaskOpen}
        title="Create task"
        submitLabel="Create"
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={createTask}
      />

      <TaskDialog
        open={taskDialog.open}
        title="Edit task"
        submitLabel="Save"
        initialValue={
          taskDialog.task
            ? {
                title: taskDialog.task.title,
                description: taskDialog.task.description,
                status: taskDialog.task.status,
                priority: taskDialog.task.priority,
                due_date: taskDialog.task.due_date,
                assigneeName: taskDialog.task.assigneeName
              }
            : undefined
        }
        onClose={() => setTaskDialog({ open: false, task: null })}
        onSubmit={async (payload) => {
          if (!taskDialog.task) return;
          await apiPatchTask(taskDialog.task.id, {
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            due_date: payload.due_date
          });
          if (payload.assigneeName?.trim()) {
            const assigneeId = await apiLookupUserIdByName(payload.assigneeName);
            if (assigneeId) {
              await apiPatchTask(taskDialog.task.id, { assignee: assigneeId });
            }
          }
          await refreshTasks();
          setTaskDialog({ open: false, task: null });
        }}
      />

      <TaskDrawer
        open={Boolean(selectedTaskId)}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={refreshTasks}
      />

      <ConfirmDialog
        open={deleteProjectOpen}
        title="Delete project?"
        description="This will delete the project and all of its tasks."
        confirmText="Delete"
        danger
        onClose={() => setDeleteProjectOpen(false)}
        onConfirm={deleteProject}
      />

      <ConfirmDialog
        open={Boolean(deleteTaskId)}
        title="Delete task?"
        description="This task will be permanently removed."
        confirmText="Delete"
        danger
        onClose={() => setDeleteTaskId(null)}
        onConfirm={() => deleteTaskId && deleteTask(deleteTaskId)}
      />
    </Stack>
  );
}
