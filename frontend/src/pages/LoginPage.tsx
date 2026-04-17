import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { SignUpRequestDto } from '../lib/types';

type FormState = SignUpRequestDto & { email: string; password: string };

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<FormState>({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/projects';

  const update = (key: keyof FormState, value: string) => setForm((prev: FormState) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.name!.trim()) return 'Name is required';
    // if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ name: form.name.trim(), password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'grid', placeItems: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Login to manage projects and tasks.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="Name"
              value={form.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('password', e.target.value)}
              fullWidth
            />

            <Button variant="contained" size="large" onClick={handleSubmit} disabled={loading}>
              Login
            </Button>

            <Typography variant="body2">
              New here? <RouterLink to="/register">Create an account</RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
