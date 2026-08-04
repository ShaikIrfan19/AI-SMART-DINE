import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import CustomerMenu from './CustomerMenu';
import CustomerOrders from './CustomerOrders';

export default function CustomerView() {
  return (
    <Layout>
      <Routes>
        <Route index element={<CustomerMenu />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
    </Layout>
  );
}
