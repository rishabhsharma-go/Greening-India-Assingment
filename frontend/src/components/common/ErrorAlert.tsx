import React from 'react';
import { Alert } from '@mui/material';

const ErrorAlert = ({ message }: { message: string }) => (
  <Alert severity="error" sx={{ mb: 2 }}>
    {message}
  </Alert>
);

export default ErrorAlert;

