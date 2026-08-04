import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getDashboardAnalytics } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const PIE_COLORS = {
  available: '#10b981',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  cleaning: '#3b82f6',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  const fetchData = useCallback(async () => {
    try {
      const res = await getDashboardAnalytics(period, user?.restaurantId);
      setData(res.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, user?.restaurantId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  if (loading) return <Spinner fullPage />;

  const revenueData = data?.revenueChart || [];
  const categoryData = data?.ordersByCategory || [];
  const tableStatus = data?.tableDistribution || [
    { name: 'available', value: data?.stats?.availableTables || 0 },
    { name: 'occupied', value: data?.stats?.occupiedTables || 0 },
    { name: 'reserved', value: data?.stats?.reservedTables || 0 },
    { name: 'cleaning', value: data?.stats?.cleaningTables || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Restaurant performance insights</p>
        </div>
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
      </div>

      <div className="charts-grid">
        {/* Revenue Line Chart */}
        <div className="chart-card chart-wide">
          <h2 className="chart-title">Revenue Over Time</h2>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone" dataKey="revenue" name="Revenue (₹)"
                  stroke="#10b981" strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No revenue data for this period</div>
          )}
        </div>

        {/* Orders by Category Bar Chart */}
        <div className="chart-card">
          <h2 className="chart-title">Orders by Category</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No category data available</div>
          )}
        </div>

        {/* Table Status Pie Chart */}
        <div className="chart-card">
          <h2 className="chart-title">Table Status Distribution</h2>
          {tableStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={tableStatus}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {tableStatus.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No table data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
