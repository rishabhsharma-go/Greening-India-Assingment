import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Register() {
  const { saveAuth } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
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
      const { token, user } = await authApi.register({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });
      saveAuth(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
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
            <rect width="32" height="32" rx="8" fill="url(#reg-grad)" />
            <path d="M8 11h10M8 16h7M8 21h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="23" cy="21" r="4" fill="white" opacity="0.9" />
            <path d="M21 21l1.5 1.5L25 19" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="reg-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="auth-logo__name">TaskFlow</span>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Get started with TaskFlow today</p>

        {apiError && (
          <div className="alert alert--error" role="alert">
            {apiError}
          </div>
        )}

        <form id="register-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">Full Name</label>
            <input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              className={`form-input${errors.name ? ' form-input--error' : ''}`}
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              autoFocus
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">Email</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="register-password" className="form-label">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={`form-input${errors.password ? ' form-input--error' : ''}`}
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
            />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" label="Creating account…" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" id="go-to-login-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
