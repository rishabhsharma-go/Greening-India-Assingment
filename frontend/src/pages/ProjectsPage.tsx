import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Fab, Grid, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Skeleton, Paper,
} from '@mui/material';
import { Add as AddIcon, FolderOpen as FolderOpenIcon, TaskAlt as TaskAltIcon } from '@mui/icons-material';
import { Project } from '../api/types';
import { getProjects, deleteProject } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import ProjectCard from '../features/projects/ProjectCard';
import CreateProjectModal from '../features/projects/CreateProjectModal';
import ErrorAlert from '../components/common/ErrorAlert';

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [snackbar, setSnackbar] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      setProjects(await getProjects());
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      setProjects((p) => p.filter((x) => x.id !== deleteTarget.id));
      setSnackbar('Project deleted');
    } catch {
      setSnackbar('Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  const WelcomeEmptyState = () => (
    <Paper
      variant="outlined"
      sx={{ textAlign: 'center', py: 8, px: 4, mt: 2, borderStyle: 'dashed' }}
    >
      <FolderOpenIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.7 }} />
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Welcome{user?.name ? `, ${user.name}` : ''}! 👋
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={1}>
        You don't have any projects yet.
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Projects help you organise your work. Once you create a project, you can add tasks,
        set priorities, assign team members, and track progress — all in one place.
      </Typography>
      <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={4}>
        <TaskAltIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Projects → Tasks → Done ✓
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={() => setCreateOpen(true)}
      >
        Create your first project
      </Button>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>My Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? '' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        {!loading && projects.length > 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Project
          </Button>
        )}
      </Box>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      ) : projects.length === 0 ? (
        <WelcomeEmptyState />
      ) : (
        <Grid container spacing={2}>
          {projects.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <ProjectCard
                project={p}
                isOwner={p.ownerId === user?.id}
                onEdit={setEditProject}
                onDelete={setDeleteTarget}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB only visible when there are existing projects (backup shortcut) */}
      {!loading && projects.length > 0 && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
          onClick={() => setCreateOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(p) => { setProjects((prev) => [p, ...prev]); setSnackbar('Project created'); }}
      />

      <CreateProjectModal
        open={!!editProject}
        existing={editProject}
        onClose={() => setEditProject(null)}
        onSaved={(p) => { setProjects((prev) => prev.map((x) => x.id === p.id ? p : x)); setSnackbar('Project updated'); }}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Project?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete <strong>{deleteTarget?.name}</strong> and all its tasks.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnackbar('')}>{snackbar}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ProjectsPage;

