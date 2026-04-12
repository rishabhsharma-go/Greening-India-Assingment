import React from 'react';
import { Chip } from '@mui/material';
import { TaskStatus } from '../../api/types';

const statusConfig: Record<TaskStatus, { label: string; color: 'default' | 'warning' | 'success' }> = {
  todo: { label: 'To Do', color: 'default' },
  in_progress: { label: 'In Progress', color: 'warning' },
  done: { label: 'Done', color: 'success' },
};

const TaskStatusChip = ({ status }: { status: TaskStatus }) => {
  const { label, color } = statusConfig[status];
  return <Chip label={label} color={color} size="small" />;
};

export default TaskStatusChip;

