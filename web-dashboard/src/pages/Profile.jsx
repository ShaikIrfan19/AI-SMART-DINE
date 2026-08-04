import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';

const ROLE_COLORS = {
  restaurant_admin: '#10b981',
  waiter: '#3b82f6',
  customer: '#f59e0b',
};

const ROLE_LABELS = {
  restaurant_admin: 'Restaurant Admin',
  waiter: 'Waiter',
  customer: 'Customer',
};

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = await updateProfile(form);
      updateUser(res.data?.user || form);
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColor = ROLE_COLORS[user?.role] || '#6b7280';

  return (
    <Layout>
      <div className="tab-content">
        <div className="page-header">
          <h1 className="page-title">Profile</h1>
        </div>

        <div className="profile-container">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-avatar-large">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="profile-header-info">
              <h2 className="profile-name">{user?.name}</h2>
              <p className="profile-email">{user?.email}</p>
              <span
                className="role-badge-large"
                style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
              >
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Account Information</h2>
              {!editing && (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text" className="form-input"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel" className="form-input"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <Spinner size="sm" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{user?.name || '—'}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user?.email || '—'}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{user?.phone || '—'}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">{ROLE_LABELS[user?.role] || user?.role}</span>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button className="btn btn-danger btn-full logout-btn" onClick={handleLogout}>
            ⏻ Sign Out
          </button>
        </div>
      </div>
    </Layout>
  );
}
