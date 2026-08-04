import React, { useState, useEffect, useCallback } from 'react';
import { getOrders, updateOrderStatus } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
const STATUS_CONFIG = {
  pending: { color: '#f59e0b', label: 'Pending', next: 'confirmed' },
  confirmed: { color: '#3b82f6', label: 'Confirmed', next: 'preparing' },
  preparing: { color: '#8b5cf6', label: 'Preparing', next: 'ready' },
  ready: { color: '#10b981', label: 'Ready', next: 'served' },
  served: { color: '#6b7280', label: 'Served', next: null },
};

export default function AdminOrders() {
  const toast = useToast();
  const { on, off } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getOrders();
      setOrders(res.data?.orders || res.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    const handle = () => fetchOrders();
    on('new_order', handle);
    on('order_status_changed', handle);
    return () => { off('new_order', handle); off('order_status_changed', handle); };
  }, [on, off, fetchOrders]);

  const handleAdvanceStatus = async (order) => {
    const cfg = STATUS_CONFIG[order.status];
    if (!cfg?.next) return;
    setUpdatingId(order._id);
    try {
      await updateOrderStatus(order._id, cfg.next);
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: cfg.next } : o));
      toast.success(`Order ${order._id.slice(-6)} → ${cfg.next}`);
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <Spinner fullPage />;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{orders.length} total orders</p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={fetchOrders}>↻</button>
      </div>

      {/* Status Filter */}
      <div className="status-filters">
        <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="filter-count">{orders.length}</span>
        </button>
        {STATUS_FLOW.map(s => (
          <button
            key={s}
            className={`filter-btn${filter === s ? ' active' : ''}`}
            onClick={() => setFilter(s)}
            style={{ '--f-color': STATUS_CONFIG[s].color }}
          >
            {STATUS_CONFIG[s].label}
            <span className="filter-count">{orders.filter(o => o.status === s).length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No orders found" subtitle="Orders will appear here when placed" />
      ) : (
        <div className="orders-grid">
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            return (
              <div key={order._id} className="order-card" style={{ '--order-color': cfg.color }}>
                <div className="order-card-header">
                  <div>
                    <span className="order-card-id">#{order._id?.slice(-6)}</span>
                    <span className="order-card-table">Table {order.table?.tableNumber || 'N/A'}</span>
                  </div>
                  <span className="status-badge" style={{ '--status-color': cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                <div className="order-items-list">
                  {order.items?.map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span>{item.menuItem?.name || 'Unknown item'}</span>
                      <span className="order-item-qty">×{item.quantity}</span>
                      <span className="order-item-price">₹{(item.price || 0) * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div>
                    <span className="order-total">₹{order.totalAmount || 0}</span>
                    <span className="order-time">{new Date(order.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {cfg.next && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAdvanceStatus(order)}
                      disabled={updatingId === order._id}
                    >
                      {updatingId === order._id ? <Spinner size="sm" /> : `Mark ${cfg.next}`}
                    </button>
                  )}
                </div>

                {/* Status Pipeline */}
                <div className="status-pipeline">
                  {STATUS_FLOW.map((s, i) => {
                    const currentIdx = STATUS_FLOW.indexOf(order.status);
                    const isDone = i <= currentIdx;
                    return (
                      <React.Fragment key={s}>
                        <div className={`pipeline-step${isDone ? ' done' : ''}`} style={{ '--p-color': STATUS_CONFIG[s].color }}>
                          <div className="pipeline-dot" />
                          <span className="pipeline-label">{STATUS_CONFIG[s].label}</span>
                        </div>
                        {i < STATUS_FLOW.length - 1 && (
                          <div className={`pipeline-line${i < currentIdx ? ' done' : ''}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
