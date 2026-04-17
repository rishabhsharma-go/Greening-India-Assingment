import type { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { userName, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {isAuthenticated ? (
        <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 2, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/projects')}>
              TaskFlow
            </Typography>

            <Box sx={{ flex: 1 }} />

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {userName}
            </Typography>

            <Button color="inherit" variant="outlined" onClick={logout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>
      ) : null}

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
