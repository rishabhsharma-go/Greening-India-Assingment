import { Alert, Box, Typography } from '@mui/material';

export function EmptyState({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 3, p: 4, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Alert severity="info" sx={{ justifyContent: 'center', maxWidth: 520, mx: 'auto' }}>
        {message}
      </Alert>
    </Box>
  );
}
