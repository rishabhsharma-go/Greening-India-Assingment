import React from 'react';
import { Box, Typography } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';

const EmptyState = ({ message }: { message: string }) => (
  <Box display="flex" flexDirection="column" alignItems="center" py={6} color="text.secondary">
    <InboxIcon sx={{ fontSize: 56, mb: 1, opacity: 0.4 }} />
    <Typography variant="body1">{message}</Typography>
  </Box>
);

export default EmptyState;

