import { Box, CircularProgress, Typography } from '@mui/material';

export function LoadingBlock({ label = 'Loading...' }: { label?: string }) {
  return (
    <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center', gap: 1 }}>
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
