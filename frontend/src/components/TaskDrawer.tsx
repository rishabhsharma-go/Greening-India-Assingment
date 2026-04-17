import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiGetTask, apiGetUserName, apiLookupUserIdByName, apiPatchTask, apiDeleteTask } from '../lib/api';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../lib/constants';
import { formatDate, formatDateTime } from '../lib/format';
import type { TaskDetailDto } from '../lib/types';
import { LoadingBlock } from './LoadingBlock';

type Props = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: () => void;
};

type LocalTask = TaskDetailDto & {
  assigneeName: string;
};

export function TaskDrawer({ open, taskId, onClose, onTaskUpdated }: Props) {
  const [task, setTask] = useState<LocalTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigneeInput, setAssigneeInput] = useState('');

  const width = useMemo(() => ({ xs: '100vw', sm: 520 }), []);

  useEffect(() => {
    const load = async () => {
      if (!open || !taskId) return;

      try {
        setLoading(true);
        setError(null);
        setSaveMessage(null);

        const data = await apiGetTask(taskId);
        let assigneeName = 'Unassigned';
        if (data.assignee_id) {
          try {
            assigneeName = await apiGetUserName(data.assignee_id);
          } catch {
            assigneeName = data.assignee_id;
          }
        }

        setTask({ ...data, assigneeName });
        setAssigneeInput(assigneeName === 'Unassigned' ? '' : assigneeName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, taskId]);

  const patchTask = async (
    patch: Partial<Record<'title' | 'description' | 'status' | 'priority' | 'assignee' | 'due_date', string>>
  ) => {
    if (!taskId || !task) return;

    const previous = task;
    const optimistic: LocalTask = {
      ...task,
      title: patch.title ?? task.title,
      description: patch.description ?? task.description,
      status: patch.status ?? task.status,
      priority: patch.priority ?? task.priority,
      due_date: patch.due_date ?? task.due_date,
      assigneeName: patch.assignee ? assigneeInput : task.assigneeName
    };

    setTask(optimistic);

    try {
      setSaving(true);
      await apiPatchTask(taskId, patch);
      setSaveMessage('Saved');
      onTaskUpdated();
    } catch (err) {
      setTask(previous);
      setError(err instanceof Error ? err.message : 'Could not save task');
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async () => {
    if (!task) return;
    await patchTask({
      title: task.title,
      description: task.description,
      due_date: task.due_date
    });
  };

  const savePriority = async () => {
    if (!task) return;
    await patchTask({ priority: task.priority });
  };

  const updateAssignee = async () => {
    if (!taskId || !assigneeInput.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const assigneeId = await apiLookupUserIdByName(assigneeInput.trim());
      await apiPatchTask(taskId, { assignee: assigneeId });

      const name = await apiGetUserName(assigneeId).catch(() => assigneeInput.trim());
      setTask((prev: LocalTask | null) => (prev ? { ...prev, assigneeName: name, assignee_id: assigneeId } : prev));
      setSaveMessage('Assignee updated');
      onTaskUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update assignee');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
  if (!taskId) return;

  const confirmDelete = window.confirm("Are you sure you want to delete this task?");
  if (!confirmDelete) return;

  try {
    setSaving(true);
    setError(null);

    await apiDeleteTask(taskId);

    setSaveMessage("Task deleted");

    // Close drawer after deletion
    onClose();

    // Refresh parent (project/task list)
    onTaskUpdated();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to delete task");
  } finally {
    setSaving(false);
  }
};

  const updateStatus = async (value: string) => {
    if (!task) return;
    await patchTask({ status: value });
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width } }}>
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Task details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {taskId ? `Task ${taskId}` : 'No task selected'}
            </Typography>
          </Box>

          {loading ? (
            <LoadingBlock label="Loading task details..." />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : task ? (
            <>
              {saveMessage ? <Alert severity="success">{saveMessage}</Alert> : null}

              <TextField
                label="Title"
                value={task.title}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTask((prev: LocalTask | null) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                fullWidth
              />

              <TextField
                label="Description"
                value={task.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTask((prev: LocalTask | null) => (prev ? { ...prev, description: e.target.value } : prev))
                }
                fullWidth
                multiline
                minRows={4}
              />

              <TextField
                select
                label="Status"
                value={task.status}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateStatus(e.target.value)}
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
                value={task.priority}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTask((prev: LocalTask | null) => (prev ? { ...prev, priority: e.target.value } : prev))
                }
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
                value={task.due_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTask((prev: LocalTask | null) => (prev ? { ...prev, due_date: e.target.value } : prev))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" onClick={saveDetails} disabled={saving}>
                  Save details
                </Button>
                <Button variant="outlined" onClick={savePriority} disabled={saving}>
                  Update priority
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Assignee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {task.assigneeName || 'Unassigned'}
                </Typography>
                <TextField
                  label="Assignee name"
                  value={assigneeInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAssigneeInput(e.target.value)}
                  fullWidth
                />
                <Button variant="outlined" onClick={updateAssignee} disabled={saving || !assigneeInput.trim()}>
                  Update assignee
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={deleteTask}
                  disabled={saving}
                >
                  {saving ? "Deleting..." : "Delete Task"}
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDateTime(task.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDateTime(task.updated_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Due: {formatDate(task.due_date)}
                </Typography>
              </Stack>
            </>
          ) : null}
        </Stack>
      </Box>
    </Drawer>
  );
}
