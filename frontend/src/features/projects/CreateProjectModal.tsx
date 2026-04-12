import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Alert, Box,
} from '@mui/material';
import { Project } from '../../api/types';
import { createProject, updateProject } from '../../api/projects';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (project: Project) => void;
  existing?: Project | null;
}

const CreateProjectModal = ({ open, onClose, onSaved, existing }: Props) => {
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open) {
      setName(existing?.name || '');
      setDescription(existing?.description || '');
      setError('');
    }
  }, [open, existing]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true); setError('');
    try {
      const saved = existing
        ? await updateProject(existing.id, { name: name.trim(), description: description.trim() || undefined })
        : await createProject(name.trim(), description.trim() || undefined);
      onSaved(saved);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{existing ? 'Edit Project' : 'New Project'}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} fullWidth />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : existing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProjectModal;

