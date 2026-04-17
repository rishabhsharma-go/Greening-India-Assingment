import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { SignUpRequestDto } from '../lib/types';

type FormState = SignUpRequestDto & { confirmPassword: string };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof FormState, value: string) => setForm((prev: FormState) => ({ ...prev, [key]: value }));

  const validate = () => {
    const name = form.name ?? "";
    const email = form.email ?? "";
    const password = form.password ?? "";
    const confirmPassword = form.confirmPassword ?? "";

    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const name = form.name ?? "";
    const email = form.email ?? "";
    const password = form.password ?? "";

    try {
      setLoading(true);
      setError(null);

      await register({
        name: name.trim(),
        email: email.trim(),
        password: password
      });

      navigate('/projects', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
                Create account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Register and start organizing work.
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
              label="Email"
              value={form.email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('email', e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('password', e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('confirmPassword', e.target.value)}
              fullWidth
            />

            <Button variant="contained" size="large" onClick={handleSubmit} disabled={loading}>
              Register
            </Button>

            <Typography variant="body2">
              Already have an account? <RouterLink to="/login">Login</RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
