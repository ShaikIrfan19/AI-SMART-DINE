import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const adminLinks = [
  { to: '/admin', label: 'Overview', icon: '⊞', end: true },
  { to: '/admin/tables', label: 'Tables', icon: '⊡' },
  { to: '/admin/menu', label: 'Menu', icon: '🍽️' },
  { to: '/admin/orders', label: 'Orders', icon: '📋' },
  { to: '/admin/staff', label: 'Staff', icon: '👥' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📊' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const waiterLinks = [
  { to: '/waiter', label: 'Dashboard', icon: '⊞', end: true },
  { to: '/waiter/tables', label: 'Tables', icon: '⊡' },
  { to: '/waiter/orders', label: 'Orders', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const customerLinks = [
  { to: '/customer', label: 'Menu', icon: '🍽️', end: true },
  { to: '/customer/orders', label: 'My Orders', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const roleLinks = {
  restaurant_admin: adminLinks,
  waiter: waiterLinks,
  customer: customerLinks,
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const links = roleLinks[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">🍽️</span>
          {!collapsed && <span className="logo-text">AI Smart Dine</span>}
        </div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
        {!collapsed && (
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className={`role-badge role-${user?.role}`}>
              {user?.role === 'restaurant_admin' ? 'Admin' : user?.role}
            </span>
          </div>
        )}
        {connected && <span className="socket-dot" title="Real-time connected" />}
      </div>

      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            {!collapsed && <span className="nav-label">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <span className="nav-icon">⏻</span>
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}
