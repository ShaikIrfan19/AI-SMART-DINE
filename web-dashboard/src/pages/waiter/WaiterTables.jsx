import React, { useState, useEffect, useCallback } from 'react';
import { getTables, updateTableStatus } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_CONFIG = {
  available: { color: '#10b981', label: 'Available', bg: 'rgba(16,185,129,0.15)' },
  occupied: { color: '#ef4444', label: 'Occupied', bg: 'rgba(239,68,68,0.15)' },
  reserved: { color: '#f59e0b', label: 'Reserved', bg: 'rgba(245,158,11,0.15)' },
  cleaning: { color: '#3b82f6', label: 'Cleaning', bg: 'rgba(59,130,246,0.15)' },
};

export default function WaiterTables() {
  const { user } = useAuth();
  const toast = useToast();
  const { on, off } = useSocket();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(null);

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

  const handleStatusChange = async (status) => {
    if (!statusModal) return;
    try {
      await updateTableStatus(statusModal._id, status);
      toast.success('Table status updated');
      setStatusModal(null);
      fetchTables();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Spinner fullPage />;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tables</h1>
          <p className="page-subtitle">{tables.length} tables</p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={fetchTables}>↻</button>
      </div>

      {tables.length === 0 ? (
        <EmptyState icon="⊡" title="No tables found" subtitle="Tables will appear here" />
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
                </div>
                <div className="table-card-glow" />
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!statusModal} onClose={() => setStatusModal(null)} title={`Table ${statusModal?.tableNumber} — Change Status`}>
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
    </div>
  );
}
