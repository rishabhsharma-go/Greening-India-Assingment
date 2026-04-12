import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Login() {
  const { saveAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    setApiError('');
  }

  function validate() {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const { token, user } = await authApi.login({
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });
      saveAuth(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setApiError('Incorrect email or password.');
      } else {
        setApiError(err.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="url(#auth-grad)" />
            <path d="M8 11h10M8 16h7M8 21h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="23" cy="21" r="4" fill="white" opacity="0.9" />
            <path d="M21 21l1.5 1.5L25 19" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="auth-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="auth-logo__name">TaskFlow</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue to your workspace</p>

        {apiError && (
          <div className="alert alert--error" role="alert">
            {apiError}
          </div>
        )}

        <form id="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              autoFocus
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className={`form-input${errors.password ? ' form-input--error' : ''}`}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" label="Signing in…" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" id="go-to-register-link">Create one</Link>
        </p>

        <div className="auth-hint">
          <p className="auth-hint__title">Demo credentials</p>
          <p>jane@example.com / secret123</p>
        </div>
      </div>
    </div>
  );
}
