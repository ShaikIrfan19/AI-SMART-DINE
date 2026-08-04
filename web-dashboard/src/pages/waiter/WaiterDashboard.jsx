import React, { useState, useEffect, useCallback } from 'react';
import { getTables, getLiveOrders } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

export default function WaiterDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        user?.restaurantId ? getTables(user.restaurantId) : Promise.resolve({ data: [] }),
        getLiveOrders(),
      ]);
      setTables(tablesRes.data?.tables || tablesRes.data || []);
      setOrders(ordersRes.data?.orders || ordersRes.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <Spinner fullPage />;

  const available = tables.filter(t => t.status === 'available').length;
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Waiter Dashboard</h1>
          <p className="page-subtitle">Good day, {user?.name} 👋</p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={fetchData}>↻</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>⊡</div>
          <div className="stat-info">
            <span className="stat-value">{tables.length}</span>
            <span className="stat-label">Total Tables</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓</div>
          <div className="stat-info">
            <span className="stat-value">{available}</span>
            <span className="stat-label">Available</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>●</div>
          <div className="stat-info">
            <span className="stat-value">{occupied}</span>
            <span className="stat-label">Occupied</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>📋</div>
          <div className="stat-info">
            <span className="stat-value">{pendingOrders}</span>
            <span className="stat-label">Live Orders</span>
          </div>
        </div>
      </div>

      {/* Live Orders Preview */}
      <div className="section-card">
        <h2 className="section-title">Active Orders</h2>
        {orders.filter(o => o.status === 'ready').length > 0 && (
          <div className="alert-banner">
            🔔 {orders.filter(o => o.status === 'ready').length} order(s) are READY to serve!
          </div>
        )}
        {orders.slice(0, 5).map(order => (
          <div key={order._id} className="order-row">
            <span className="order-id">#{order._id?.slice(-6)}</span>
            <span className="order-table">Table {order.table?.tableNumber || '-'}</span>
            <span className="status-badge" style={{ '--status-color': order.status === 'ready' ? '#10b981' : '#f59e0b' }}>
              {order.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
