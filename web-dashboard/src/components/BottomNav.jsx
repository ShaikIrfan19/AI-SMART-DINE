import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/admin', label: 'Overview', icon: '⊞', end: true },
  { to: '/admin/tables', label: 'Tables', icon: '⊡' },
  { to: '/admin/menu', label: 'Menu', icon: '🍽️' },
  { to: '/admin/orders', label: 'Orders', icon: '📋' },
  { to: '/admin/staff', label: 'Staff', icon: '👥' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📊' },
];

const waiterLinks = [
  { to: '/waiter', label: 'Dash', icon: '⊞', end: true },
  { to: '/waiter/tables', label: 'Tables', icon: '⊡' },
  { to: '/waiter/orders', label: 'Orders', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const customerLinks = [
  { to: '/customer', label: 'Menu', icon: '🍽️', end: true },
  { to: '/customer/orders', label: 'Orders', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const roleLinks = {
  restaurant_admin: adminLinks,
  waiter: waiterLinks,
  customer: customerLinks,
};

export default function BottomNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = roleLinks[user?.role] || [];

  return (
    <nav className="bottom-nav">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{link.icon}</span>
          <span className="bottom-nav-label">{link.label}</span>
        </NavLink>
      ))}
      <button
        className="bottom-nav-item"
        onClick={() => { logout(); navigate('/login'); }}
      >
        <span className="bottom-nav-icon">⏻</span>
        <span className="bottom-nav-label">Logout</span>
      </button>
    </nav>
  );
}
