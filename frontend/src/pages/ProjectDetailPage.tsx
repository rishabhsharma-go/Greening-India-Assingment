import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Typography, Button, Chip, FormControl,
  InputLabel, Select, MenuItem, Snackbar, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Breadcrumbs, Link, Fab, LinearProgress,
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Project, Task, TaskStatus } from '../api/types';
import { getProject } from '../api/projects';
import { getTasks, updateTask, deleteTask } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../features/tasks/TaskCard';
import TaskModal from '../features/tasks/TaskModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import EmptyState from '../components/common/EmptyState';

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const [proj, taskList] = await Promise.all([
        getProject(id),
        getTasks(id, statusFilter ? { status: statusFilter } : undefined),
      ]);
      setProject(proj);
      setTasks(taskList);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await updateTask(task.id, { status: newStatus });
    } catch {
      // Revert on error
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t));
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setSnackbar({ open: true, message: 'Task deleted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete task', severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleTaskSaved = (saved: Task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setSnackbar({ open: true, message: editTask ? 'Task updated' : 'Task created', severity: 'success' });
  };

  if (loading) return <LoadingSpinner minHeight="60vh" />;
  if (error) return <Container sx={{ py: 4 }}><ErrorAlert message={error} /></Container>;
  if (!project) return null;

  const filteredTasks = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/projects" underline="hover" color="inherit">Projects</Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{project.name}</Typography>
          {project.description && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>{project.description}</Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditTask(null); setTaskModalOpen(true); }}>
          New Task
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by status"
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="todo">To Do</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="done">Done</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" alignSelf="center">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {filteredTasks.length === 0 ? (
        <EmptyState message={statusFilter ? `No ${statusFilter.replace('_', ' ')} tasks` : 'No tasks yet. Add your first task!'} />
      ) : (
        filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onStatusChange={handleStatusChange}
            onEdit={(t) => { setEditTask(t); setTaskModalOpen(true); }}
            onDelete={setDeleteTarget}
          />
        ))
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTask(null); }}
        projectId={id!}
        task={editTask}
        onSaved={handleTaskSaved}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Task?</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteTask}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProjectDetailPage;

