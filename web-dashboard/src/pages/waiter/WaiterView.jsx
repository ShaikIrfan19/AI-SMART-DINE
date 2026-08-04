import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import WaiterDashboard from './WaiterDashboard';
import WaiterTables from './WaiterTables';
import WaiterOrders from './WaiterOrders';

export default function WaiterView() {
  return (
    <Layout>
      <Routes>
        <Route index element={<WaiterDashboard />} />
        <Route path="tables" element={<WaiterTables />} />
        <Route path="orders" element={<WaiterOrders />} />
        <Route path="*" element={<Navigate to="/waiter" replace />} />
      </Routes>
    </Layout>
  );
}
