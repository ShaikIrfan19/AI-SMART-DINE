import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AdminOverview from './AdminOverview';
import AdminTables from './AdminTables';
import AdminMenu from './AdminMenu';
import AdminOrders from './AdminOrders';
import AdminStaff from './AdminStaff';
import AdminAnalytics from './AdminAnalytics';

export default function AdminDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="tables" element={<AdminTables />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Layout>
  );
}
