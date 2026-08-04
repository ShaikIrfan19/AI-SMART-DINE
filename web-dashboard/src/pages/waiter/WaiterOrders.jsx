import React, { useState, useEffect, useCallback } from 'react';
import { getLiveOrders, updateOrderStatus } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', label: 'Pending', next: 'confirmed' },
  confirmed: { color: '#3b82f6', label: 'Confirmed', next: 'preparing' },
  preparing: { color: '#8b5cf6', label: 'Preparing', next: 'ready' },
  ready: { color: '#10b981', label: 'Ready', next: 'served' },
  served: { color: '#6b7280', label: 'Served', next: null },
};

export default function WaiterOrders() {
  const toast = useToast();
  const { on, off } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getLiveOrders();
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

  const handleAdvance = async (order) => {
    const cfg = STATUS_CONFIG[order.status];
    if (!cfg?.next) return;
    setUpdatingId(order._id);
    try {
      await updateOrderStatus(order._id, cfg.next);
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: cfg.next } : o));
      toast.success(`Order marked as ${cfg.next}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <Spinner fullPage />;

  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Orders</h1>
          <p className="page-subtitle">{orders.length} orders</p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={fetchOrders}>↻</button>
      </div>

      {readyOrders.length > 0 && (
        <div className="alert-banner">
          🔔 {readyOrders.length} order(s) are READY to serve! Table(s): {readyOrders.map(o => o.table?.tableNumber).join(', ')}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState icon="📋" title="No live orders" subtitle="Orders will appear here in real time" />
      ) : (
        <div className="orders-grid">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            return (
              <div key={order._id} className="order-card" style={{ '--order-color': cfg.color }}>
                <div className="order-card-header">
                  <div>
                    <span className="order-card-id">#{order._id?.slice(-6)}</span>
                    <span className="order-card-table">Table {order.table?.tableNumber || 'N/A'}</span>
                  </div>
                  <span className="status-badge" style={{ '--status-color': cfg.color }}>{cfg.label}</span>
                </div>
                <div className="order-items-list">
                  {order.items?.map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span>{item.menuItem?.name || 'Item'}</span>
                      <span className="order-item-qty">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="order-card-footer">
                  <span className="order-total">₹{order.totalAmount || 0}</span>
                  {cfg.next && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAdvance(order)}
                      disabled={updatingId === order._id}
                    >
                      {updatingId === order._id ? <Spinner size="sm" /> : `→ ${cfg.next}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
