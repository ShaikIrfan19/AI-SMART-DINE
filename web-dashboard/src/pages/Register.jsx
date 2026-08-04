import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const ROLES = [
  { value: 'customer', label: '🛒 Customer', desc: 'Browse menu & place orders' },
  { value: 'waiter', label: '🤵 Waiter', desc: 'Manage tables & serve orders' },
  { value: 'restaurant_admin', label: '👑 Admin', desc: 'Full restaurant management' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return false; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Valid email is required'); return false;
    }
    if (!form.phone.trim() || form.phone.length < 10) { toast.error('Valid phone number is required'); return false; }
    if (!form.password || form.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <span className="auth-logo-icon">🍽️</span>
          <div>
            <h1 className="auth-brand">AI Smart Dine</h1>
            <p className="auth-tagline">Create your account</p>
          </div>
        </div>

        <h2 className="auth-title">Get started</h2>
        <p className="auth-subtitle">Join our restaurant network</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                id="name" type="text" name="name" className="form-input"
                placeholder="John Doe" value={form.name}
                onChange={handleChange} disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input
                id="phone" type="tel" name="phone" className="form-input"
                placeholder="+1 234 567 8900" value={form.phone}
                onChange={handleChange} disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email" type="email" name="email" className="form-input"
              placeholder="you@restaurant.com" value={form.email}
              onChange={handleChange} disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="input-group">
              <input
                id="reg-password" type={showPass ? 'text' : 'password'} name="password"
                className="form-input" placeholder="Min. 6 characters" value={form.password}
                onChange={handleChange} disabled={loading}
              />
              <button type="button" className="input-addon" onClick={() => setShowPass(s => !s)}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Your Role</label>
            <div className="role-chips">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`role-chip${form.role === r.value ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  disabled={loading}
                >
                  <span className="role-chip-label">{r.label}</span>
                  <span className="role-chip-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
