import React from 'react';
import {
  Card, CardContent, CardActions, Typography, Box, IconButton, Tooltip, Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { Task, TaskStatus } from '../../api/types';
import TaskStatusChip from './TaskStatusChip';
import PriorityChip from './PriorityChip';

const STATUS_CYCLE: TaskStatus[] = ['todo', 'in_progress', 'done'];

interface Props {
  task: Task;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const TaskCard = ({ task, onStatusChange, onEdit, onDelete }: Props) => {
  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
            {task.title}
          </Typography>
          <PriorityChip priority={task.priority} />
        </Box>

        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
            {task.description}
          </Typography>
        )}

        <Box display="flex" gap={1} flexWrap="wrap" mt={1} alignItems="center">
          <Tooltip title={`Click to advance to "${nextStatus}"`}>
            <span style={{ cursor: 'pointer' }} onClick={() => onStatusChange(task, nextStatus)}>
              <TaskStatusChip status={task.status} />
            </span>
          </Tooltip>

          {task.assigneeName && (
            <Box display="flex" alignItems="center" gap={0.3}>
              <PersonIcon sx={{ fontSize: 14 }} color="action" />
              <Typography variant="caption" color="text.secondary">
                {task.assigneeName}
              </Typography>
            </Box>
          )}

          {task.dueDate && (
            <Box display="flex" alignItems="center" gap={0.3}>
              <CalendarTodayIcon sx={{ fontSize: 14 }} color="action" />
              <Typography variant="caption" color="text.secondary">
                {task.dueDate}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="Edit task">
          <IconButton size="small" onClick={() => onEdit(task)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete task">
          <IconButton size="small" color="error" onClick={() => onDelete(task)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default TaskCard;

