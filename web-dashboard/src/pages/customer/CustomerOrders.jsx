import React, { useState, useEffect, useCallback } from 'react';
import { getOrders } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', label: 'Pending', icon: '⏳' },
  confirmed: { color: '#3b82f6', label: 'Confirmed', icon: '✓' },
  preparing: { color: '#8b5cf6', label: 'Preparing', icon: '👨‍🍳' },
  ready: { color: '#10b981', label: 'Ready!', icon: '🔔' },
  served: { color: '#6b7280', label: 'Served', icon: '✅' },
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

export default function CustomerOrders() {
  const toast = useToast();
  const { on, off } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
    on('order_status_changed', handle);
    return () => off('order_status_changed', handle);
  }, [on, off, fetchOrders]);

  if (loading) return <Spinner fullPage />;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track your food journey</p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={fetchOrders}>↻</button>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon="🍽️" title="No orders yet" subtitle="Place an order from the menu to get started" />
      ) : (
        <div className="orders-grid">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const currentIdx = STATUS_FLOW.indexOf(order.status);
            return (
              <div key={order._id} className="order-card" style={{ '--order-color': cfg.color }}>
                <div className="order-card-header">
                  <div>
                    <span className="order-card-id">#{order._id?.slice(-6)}</span>
                    <span className="order-card-table">Table {order.table?.tableNumber || 'N/A'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="status-badge" style={{ '--status-color': cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Order Tracking */}
                <div className="status-pipeline">
                  {STATUS_FLOW.map((s, i) => {
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

                <div className="order-items-list">
                  {order.items?.map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span>{item.menuItem?.name || 'Item'}</span>
                      <span className="order-item-qty">×{item.quantity}</span>
                      <span className="order-item-price">₹{(item.price || 0) * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <span className="order-total">Total: ₹{order.totalAmount || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
