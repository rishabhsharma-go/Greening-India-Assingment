import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingSpinner = ({ minHeight = '200px' }: { minHeight?: string }) => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight={minHeight}>
    <CircularProgress />
  </Box>
);

export default LoadingSpinner;

