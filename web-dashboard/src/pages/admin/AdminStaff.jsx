import React, { useState, useEffect, useCallback } from 'react';
import { getStaff, createStaff, updateStaffStatus } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

export default function AdminStaff() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'waiter' });
  const [showPass, setShowPass] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await getStaff();
      setStaff(res.data?.staff || res.data || []);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name.trim()) { toast.error('Name is required'); return; }
    if (!newStaff.email.trim()) { toast.error('Email is required'); return; }
    if (!newStaff.phone.trim()) { toast.error('Phone is required'); return; }
    if (!newStaff.password || newStaff.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await createStaff(newStaff);
      toast.success('Staff member added');
      setAddModal(false);
      setNewStaff({ name: '', email: '', phone: '', password: '', role: 'waiter' });
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member) => {
    setTogglingId(member._id);
    try {
      await updateStaffStatus(member._id, !member.isActive);
      setStaff(prev => prev.map(s => s._id === member._id ? { ...s, isActive: !s.isActive } : s));
      toast.success(`${member.name} is now ${!member.isActive ? 'active' : 'inactive'}`);
    } catch {
      toast.error('Failed to update staff status');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <Spinner fullPage />;

  const ROLE_COLORS = { waiter: '#3b82f6', restaurant_admin: '#10b981', customer: '#f59e0b' };

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">{staff.length} members</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-icon" onClick={fetchStaff}>↻</button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add Waiter</button>
        </div>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No staff members"
          subtitle="Add your first staff member"
          action={{ label: '+ Add Waiter', onClick: () => setAddModal(true) }}
        />
      ) : (
        <div className="staff-grid">
          {staff.map(member => (
            <div key={member._id} className={`staff-card${!member.isActive ? ' inactive' : ''}`}>
              <div className="staff-avatar">
                {member.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="staff-info">
                <h3 className="staff-name">{member.name}</h3>
                <p className="staff-email">{member.email}</p>
                {member.phone && <p className="staff-phone">📞 {member.phone}</p>}
                <span
                  className="role-badge"
                  style={{ background: `${ROLE_COLORS[member.role]}20`, color: ROLE_COLORS[member.role] }}
                >
                  {member.role === 'restaurant_admin' ? 'Admin' : member.role}
                </span>
              </div>
              <div className="staff-status-col">
                <span className={`active-indicator ${member.isActive ? 'active' : 'inactive'}`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  className={`toggle-switch${member.isActive ? ' on' : ''}`}
                  onClick={() => handleToggleStatus(member)}
                  disabled={togglingId === member._id}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Staff Member">
        <form onSubmit={handleAddStaff}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text" className="form-input"
                value={newStaff.name}
                onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel" className="form-input"
                value={newStaff.phone}
                onChange={e => setNewStaff(s => ({ ...s, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="form-input"
              value={newStaff.email}
              onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))}
              placeholder="staff@restaurant.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <input
                type={showPass ? 'text' : 'password'} className="form-input"
                value={newStaff.password}
                onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))}
                placeholder="Min. 6 characters"
              />
              <button type="button" className="input-addon" onClick={() => setShowPass(p => !p)}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-input"
              value={newStaff.role}
              onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))}
            >
              <option value="waiter">Waiter</option>
              <option value="restaurant_admin">Admin</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
