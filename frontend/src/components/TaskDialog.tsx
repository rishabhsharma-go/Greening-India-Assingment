import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../lib/constants';

export type TaskFormValue = {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigneeName?: string;
};

export function TaskDialog({
  open,
  title,
  submitLabel,
  initialValue,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValue?: Partial<TaskFormValue> | null;
  onClose: () => void;
  onSubmit: (payload: TaskFormValue) => Promise<void>;
}) {
  const [form, setForm] = useState<TaskFormValue>({
    title: '',
    description: '',
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    due_date: '',
    assigneeName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormValue, string>>>({});

  useEffect(() => {
    if (open) {
      setForm({
        title: initialValue?.title ?? '',
        description: initialValue?.description ?? '',
        status: initialValue?.status ?? STATUS_OPTIONS[0],
        priority: initialValue?.priority ?? PRIORITY_OPTIONS[1],
        due_date: initialValue?.due_date ?? '',
        assigneeName: initialValue?.assigneeName ?? ''
      });
      setErrors({});
    }
  }, [open, initialValue]);

  const update = <K extends keyof TaskFormValue>(key: K, value: TaskFormValue[K]) => {
    setForm((prev: TaskFormValue) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const nextErrors: Partial<Record<keyof TaskFormValue, string>> = {};
    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!form.due_date) nextErrors.due_date = 'Due date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitting(true);
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        due_date: form.due_date,
        assigneeName: form.assigneeName?.trim() ?? ''
      });
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
            label="Title"
            value={form.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('title', e.target.value)}
            error={Boolean(errors.title)}
            helperText={errors.title}
            fullWidth
            autoFocus
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('description', e.target.value)}
            fullWidth
            multiline
            minRows={4}
          />
          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('status', e.target.value)}
            fullWidth
          >
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Priority"
            value={form.priority}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('priority', e.target.value)}
            fullWidth
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <MenuItem key={priority} value={priority}>
                {priority}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('due_date', e.target.value)}
            helperText={errors.due_date}
            error={Boolean(errors.due_date)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Assignee name (optional)"
            value={form.assigneeName ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('assigneeName', e.target.value)}
            fullWidth
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
