import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardAnalytics, updateRestaurant } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  served: '#6b7280',
};

export default function AdminOverview() {
  const { user } = useAuth();
  const toast = useToast();
  const { on, off } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getDashboardAnalytics(period, user?.restaurantId);
      setData(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [period, user?.restaurantId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const handleNewOrder = () => fetchData();
    const handleStatusChange = () => fetchData();
    on('new_order', handleNewOrder);
    on('order_status_changed', handleStatusChange);
    return () => {
      off('new_order', handleNewOrder);
      off('order_status_changed', handleStatusChange);
    };
  }, [on, off, fetchData]);

  const handleToggleRestaurant = async () => {
    if (!user?.restaurantId) return toast.error('No restaurant linked to your account');
    setToggling(true);
    try {
      const newStatus = !data?.restaurant?.isOpen;
      await updateRestaurant(user.restaurantId, { isOpen: newStatus });
      setData(d => ({ ...d, restaurant: { ...d?.restaurant, isOpen: newStatus } }));
      toast.success(`Restaurant is now ${newStatus ? 'Open' : 'Closed'}`);
    } catch {
      toast.error('Failed to update restaurant status');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Spinner fullPage />;

  const stats = data?.stats || {};
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Welcome back, {user?.name} 👋</p>
        </div>
        <div className="header-actions">
          <div className="period-selector">
            {['today', 'week', 'month'].map(p => (
              <button
                key={p}
                className={`period-btn${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={fetchData} title="Refresh">
            ↻
          </button>
        </div>
      </div>

      {/* Restaurant Status Toggle */}
      <div className="restaurant-status-card">
        <div className="status-info">
          <span className={`status-dot ${data?.restaurant?.isOpen ? 'dot-green' : 'dot-red'}`} />
          <div>
            <span className="status-label">Restaurant Status</span>
            <span className="status-value">{data?.restaurant?.isOpen ? 'Open for Orders' : 'Currently Closed'}</span>
          </div>
        </div>
        <button
          className={`toggle-switch${data?.restaurant?.isOpen ? ' on' : ''}`}
          onClick={handleToggleRestaurant}
          disabled={toggling}
          aria-label="Toggle restaurant open/closed"
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>💰</div>
          <div className="stat-info">
            <span className="stat-value">₹{(stats.revenue || 0).toLocaleString()}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
          <div className="stat-trend up">↑ {stats.revenueGrowth || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>📋</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalOrders || 0}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-trend up">↑ {stats.ordersGrowth || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>⊡</div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeTables || 0}</span>
            <span className="stat-label">Active Tables</span>
          </div>
          <div className="stat-trend neutral">→ Live</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats.staffCount || 0}</span>
            <span className="stat-label">Staff Members</span>
          </div>
          <div className="stat-trend neutral">→ Total</div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Recent Orders</h2>
          <span className="badge">{recentOrders.length}</span>
        </div>
        {recentOrders.length === 0 ? (
          <EmptyState icon="📋" title="No orders yet" subtitle="Orders will appear here" />
        ) : (
          <div className="orders-list">
            {recentOrders.map(order => (
              <div key={order._id} className="order-row">
                <div className="order-row-left">
                  <span className="order-id">#{order._id?.slice(-6)}</span>
                  <span className="order-table">Table {order.table?.tableNumber || 'N/A'}</span>
                </div>
                <div className="order-row-center">
                  <span className="order-items">{order.items?.length || 0} items</span>
                  <span className="order-amount">₹{order.totalAmount || 0}</span>
                </div>
                <span
                  className="status-badge"
                  style={{ '--status-color': STATUS_COLORS[order.status] || '#6b7280' }}
                >
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
