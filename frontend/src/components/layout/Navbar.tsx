import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Avatar,
  Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <AssignmentIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 700 }}
            onClick={() => navigate('/projects')}
          >
            TaskFlow
          </Typography>

          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton color="inherit" onClick={toggleMode} size="small" sx={{ mr: 1 }}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.875rem' }}>
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user.name}
              </Typography>
              <Tooltip title="Logout">
                <IconButton color="inherit" onClick={() => setLogoutDialogOpen(true)} size="small">
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>Log out?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to log out?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleLogoutConfirm}>
            Log out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;

