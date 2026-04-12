import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Link, Divider,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { register as apiRegister } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setFieldErrors({});
    try {
      const data = await apiRegister(name, email, password);
      login(data.token, data.user);
      navigate('/projects');
    } catch (e: any) {
      if (e.response?.data?.fields) {
        setFieldErrors(e.response.data.fields);
      } else {
        setError(e.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" px={2}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>Create account</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Join TaskFlow today</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Full Name" value={name} onChange={(e) => setName(e.target.value)}
              required fullWidth autoFocus
              error={!!fieldErrors.name} helperText={fieldErrors.name}
            />
            <TextField
              label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required fullWidth
              error={!!fieldErrors.email} helperText={fieldErrors.email}
            />
            <TextField
              label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required fullWidth inputProps={{ minLength: 8 }}
              error={!!fieldErrors.password} helperText={fieldErrors.password || 'At least 8 characters'}
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" textAlign="center">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;

