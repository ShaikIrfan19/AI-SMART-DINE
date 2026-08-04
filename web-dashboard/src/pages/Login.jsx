import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const roleRedirects = {
  restaurant_admin: '/admin',
  waiter: '/waiter',
  customer: '/customer',
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.email.trim()) { toast.error('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Invalid email format'); return false; }
    if (!form.password) { toast.error('Password is required'); return false; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name}!`);
      const from = location.state?.from?.pathname;
      const redirect = from || roleRedirects[result.user.role] || '/login';
      navigate(redirect, { replace: true });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🍽️</span>
          <div>
            <h1 className="auth-brand">AI Smart Dine</h1>
            <p className="auth-tagline">Restaurant Management System</p>
          </div>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-input"
              placeholder="you@restaurant.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-group">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="input-addon"
                onClick={() => setShowPass(s => !s)}
                aria-label="Toggle password visibility"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one here</Link>
        </p>
      </div>
    </div>
  );
}
