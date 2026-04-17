import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import type { ProjectDetailsResponseDto } from '../lib/types';

export function ProjectDialog({
  open,
  initialValue,
  title,
  submitLabel,
  onClose,
  onSubmit
}: {
  open: boolean;
  initialValue?: Pick<ProjectDetailsResponseDto, 'name' | 'description'> | null;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setName(initialValue?.name ?? '');
      setDescription(initialValue?.description ?? '');
      setErrors({});
    }
  }, [open, initialValue]);

  const handleSubmit = async () => {
    const nextErrors: { name?: string } = {};
    if (!name.trim()) nextErrors.name = 'Project name is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitting(true);
      await onSubmit({ name: name.trim(), description: description.trim() });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Project name"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            autoFocus
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
