import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskIcon from '@mui/icons-material/Task';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiCreateProject,
  apiCreateTask,
  apiDeleteProject,
  apiGetProjects,
  apiLookupUserIdByName,
  apiPatchProject,
  apiPatchTask
} from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { ProjectDetailsResponseDto } from '../lib/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { ProjectDialog } from '../components/ProjectDialog';
import { TaskDialog, type TaskFormValue } from '../components/TaskDialog';
import { useAuth } from '../context/AuthContext';

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectDetailsResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    project: ProjectDetailsResponseDto | null;
  }>({ open: false, mode: 'create', project: null });
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    projectId: string | null;
    projectName: string;
  }>({ open: false, projectId: null, projectName: '' });
  const [confirmDelete, setConfirmDelete] = useState<ProjectDetailsResponseDto | null>(null);

  const navigate = useNavigate();
  const { userName } = useAuth();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      projects: projects.length,
      tasks: projects.reduce((sum: number, project: ProjectDetailsResponseDto) => sum + (project.tasks?.length ?? 0), 0)
    }),
    [projects]
  );

  const createProject = async (payload: { name: string; description: string }) => {
    await apiCreateProject(payload);
    await load();
  };

  const updateProject = async (payload: { name: string; description: string }) => {
    if (!projectDialog.project) return;
    await apiPatchProject(projectDialog.project.id, payload);
    await load();
  };

  const createTask = async (payload: TaskFormValue) => {
    if (!taskDialog.projectId) return;

    const created = await apiCreateTask(taskDialog.projectId, {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      due_date: payload.due_date
    });

    if (payload.assigneeName?.trim()) {
      const assigneeId = await apiLookupUserIdByName(payload.assigneeName);
      if (assigneeId) {
        await apiPatchTask(created.id, { assignee: assigneeId });
      }
    }

    navigate(`/projects/${taskDialog.projectId}`, {
      state: { newlyCreatedTaskId: created.id }
    });

    await load();
  };

  const deleteProject = async (project: ProjectDetailsResponseDto) => {
    await apiDeleteProject(project.id);
    setProjects((prev: ProjectDetailsResponseDto[]) => prev.filter((item: ProjectDetailsResponseDto) => item.id !== project.id));
    setConfirmDelete(null);
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Hello, {userName}
          </Typography>
          <Typography color="text.secondary">
            {stats.projects} projects
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setProjectDialog({ open: true, mode: 'create', project: null })}
        >
          Create project
        </Button>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <LoadingBlock label="Loading projects..." />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" message="Create your first project to get started." />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 2
          }}
        >
          {projects.map((project: ProjectDetailsResponseDto) => (
            <Card key={project.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack spacing={1}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.description || 'No description'}
                  </Typography>
                  {/* <Typography variant="body2" color="text.secondary">
                    Tasks: {project.tasks?.length ?? 0}
                  </Typography> */}
                  <Typography variant="caption" color="text.secondary">
                    Created {formatDateTime(project.created_at)}
                  </Typography>
                </Stack>
              </CardContent>

              <CardActions sx={{ flexWrap: 'wrap', gap: 1, p: 2, pt: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  View tasks
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TaskIcon />}
                  onClick={() => setTaskDialog({ open: true, projectId: project.id, projectName: project.name })}
                >
                  Create task
                </Button>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<EditIcon />}
                  onClick={() => setProjectDialog({ open: true, mode: 'edit', project })}
                >
                  Update
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="text"
                  startIcon={<DeleteIcon />}
                  onClick={() => setConfirmDelete(project)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <ProjectDialog
        open={projectDialog.open}
        title={projectDialog.mode === 'create' ? 'Create project' : 'Update project'}
        submitLabel={projectDialog.mode === 'create' ? 'Create' : 'Save'}
        initialValue={projectDialog.project ?? undefined}
        onClose={() => setProjectDialog({ open: false, mode: 'create', project: null })}
        onSubmit={projectDialog.mode === 'create' ? createProject : updateProject}
      />

      <TaskDialog
        open={taskDialog.open}
        title={`Create task${taskDialog.projectName ? ` for ${taskDialog.projectName}` : ''}`}
        submitLabel="Create"
        onClose={() => setTaskDialog({ open: false, projectId: null, projectName: '' })}
        onSubmit={createTask}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete project?"
        description={`This will permanently delete ${confirmDelete?.name ?? 'the project'} and all of its tasks.`}
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteProject(confirmDelete)}
      />
    </Stack>
  );
}
