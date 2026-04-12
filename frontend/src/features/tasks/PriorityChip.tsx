import React from 'react';
import { Chip } from '@mui/material';
import { TaskPriority } from '../../api/types';

const priorityConfig: Record<TaskPriority, { label: string; color: 'default' | 'info' | 'error' }> = {
  low: { label: 'Low', color: 'default' },
  medium: { label: 'Medium', color: 'info' },
  high: { label: 'High', color: 'error' },
};

const PriorityChip = ({ priority }: { priority: TaskPriority }) => {
  const { label, color } = priorityConfig[priority];
  return <Chip label={label} color={color} size="small" variant="outlined" />;
};

export default PriorityChip;

