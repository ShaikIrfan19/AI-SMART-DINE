import React, { useState, useEffect, useCallback } from 'react';
import { getTables, createTable, updateTableStatus, deleteTable } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_CONFIG = {
  available: { color: '#10b981', label: 'Available', bg: 'rgba(16,185,129,0.15)' },
  occupied: { color: '#ef4444', label: 'Occupied', bg: 'rgba(239,68,68,0.15)' },
  reserved: { color: '#f59e0b', label: 'Reserved', bg: 'rgba(245,158,11,0.15)' },
  cleaning: { color: '#3b82f6', label: 'Cleaning', bg: 'rgba(59,130,246,0.15)' },
};

const TABLE_TYPES = ['regular', 'vip', 'outdoor', 'booth', 'bar'];

export default function AdminTables() {
  const { user } = useAuth();
  const toast = useToast();
  const { on, off } = useSocket();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newTable, setNewTable] = useState({ tableNumber: '', seatingCapacity: '', floor: '1', tableType: 'regular' });

  const fetchTables = useCallback(async () => {
    if (!user?.restaurantId) return;
    try {
      const res = await getTables(user.restaurantId);
      setTables(res.data?.tables || res.data || []);
    } catch {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 20000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  useEffect(() => {
    const handle = () => fetchTables();
    on('table_updated', handle);
    on('table_status_changed', handle);
    return () => { off('table_updated', handle); off('table_status_changed', handle); };
  }, [on, off, fetchTables]);

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTable.tableNumber) { toast.error('Table number is required'); return; }
    if (!newTable.seatingCapacity || newTable.seatingCapacity < 1) { toast.error('Valid seating capacity is required'); return; }
    setSubmitting(true);
    try {
      await createTable({ ...newTable, restaurantId: user.restaurantId, tableNumber: Number(newTable.tableNumber), seatingCapacity: Number(newTable.seatingCapacity), floor: Number(newTable.floor) });
      toast.success('Table added successfully');
      setAddModal(false);
      setNewTable({ tableNumber: '', seatingCapacity: '', floor: '1', tableType: 'regular' });
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add table');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!statusModal) return;
    try {
      await updateTableStatus(statusModal._id, status);
      toast.success('Table status updated');
      setStatusModal(null);
      fetchTables();
    } catch {
      toast.error('Failed to update table status');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTable(deleteDialog._id);
      toast.success('Table deleted');
      fetchTables();
    } catch {
      toast.error('Failed to delete table');
    }
  };

  if (loading) return <Spinner fullPage />;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tables</h1>
          <p className="page-subtitle">{tables.length} tables total</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-icon" onClick={fetchTables} title="Refresh">↻</button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add Table</button>
        </div>
      </div>

      {/* Status legend */}
      <div className="status-legend">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="legend-item">
            <span className="legend-dot" style={{ background: cfg.color }} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon="⊡"
          title="No tables yet"
          subtitle="Add your first table to get started"
          action={{ label: '+ Add Table', onClick: () => setAddModal(true) }}
        />
      ) : (
        <div className="tables-grid">
          {tables.map(table => {
            const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
            return (
              <div
                key={table._id}
                className="table-card"
                style={{ '--table-color': cfg.color, '--table-bg': cfg.bg }}
                onClick={() => setStatusModal(table)}
              >
                <div className="table-card-header">
                  <span className="table-number">T{table.tableNumber}</span>
                  <span className="table-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="table-card-body">
                  <div className="table-info-row">
                    <span>👥 {table.seatingCapacity} seats</span>
                    <span>Floor {table.floor}</span>
                  </div>
                  <span className="table-type">{table.tableType}</span>
                </div>
                <div className="table-card-glow" />
                <button
                  className="table-delete-btn"
                  onClick={(e) => { e.stopPropagation(); setDeleteDialog(table); }}
                  title="Delete table"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add New Table">
        <form onSubmit={handleAddTable}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Table Number</label>
              <input
                type="number" className="form-input" min="1"
                value={newTable.tableNumber}
                onChange={e => setNewTable(t => ({ ...t, tableNumber: e.target.value }))}
                placeholder="e.g. 1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Seating Capacity</label>
              <input
                type="number" className="form-input" min="1"
                value={newTable.seatingCapacity}
                onChange={e => setNewTable(t => ({ ...t, seatingCapacity: e.target.value }))}
                placeholder="e.g. 4"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                type="number" className="form-input" min="1"
                value={newTable.floor}
                onChange={e => setNewTable(t => ({ ...t, floor: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Table Type</label>
              <select
                className="form-input"
                value={newTable.tableType}
                onChange={e => setNewTable(t => ({ ...t, tableType: e.target.value }))}
              >
                {TABLE_TYPES.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Add Table'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Change Modal */}
      <Modal isOpen={!!statusModal} onClose={() => setStatusModal(null)} title={`Table ${statusModal?.tableNumber} — Change Status`}>
        <p className="modal-desc">Select new status:</p>
        <div className="status-buttons">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              className="status-option-btn"
              style={{ '--s-color': cfg.color, '--s-bg': cfg.bg }}
              onClick={() => handleStatusChange(key)}
            >
              <span className="legend-dot" style={{ background: cfg.color }} />
              {cfg.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        onConfirm={handleDelete}
        title="Delete Table"
        message={`Are you sure you want to delete Table ${deleteDialog?.tableNumber}? This action cannot be undone.`}
      />
    </div>
  );
}
