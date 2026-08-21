import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

const STATUS_COLORS = {
  pending: colors.amber, confirmed: colors.blue,
  preparing: colors.purple, ready: colors.green,
  served: '#06b6d4', completed: '#22c55e', cancelled: colors.red,
};
const STATUS_ICONS = {
  pending: '⏳', confirmed: '✅', preparing: '👨‍🍳',
  ready: '🔔', served: '🍽️', completed: '💰', cancelled: '❌',
};
const NEXT_STATUS = {
  pending: 'confirmed', confirmed: 'preparing',
  preparing: 'ready', ready: 'served', served: 'completed',
};

const DEFAULT_WAITER_ORDERS = [
  {
    _id: 'w_ord1',
    orderNumber: '1001',
    status: 'preparing',
    tableNumber: '2',
    totalAmount: 620,
    items: [
      { name: 'Paneer Butter Masala', quantity: 1, isVeg: true },
      { name: 'Chicken Biryani', quantity: 1, isVeg: false },
    ],
  },
  {
    _id: 'w_ord2',
    orderNumber: '1002',
    status: 'pending',
    tableNumber: '4',
    totalAmount: 350,
    items: [
      { name: 'Crispy Veg Spring Rolls', quantity: 1, isVeg: true },
      { name: 'Fresh Mint Mojito', quantity: 1, isVeg: true },
    ],
  },
];

export default function WaiterOrdersScreen() {
  const { user } = useSelector(s => s.auth);
  const [orders, setOrders] = useState(DEFAULT_WAITER_ORDERS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('active');

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 30 });
      const res = await api.get(`/orders?${params}`).catch(() => null);
      const data = res?.data?.data || [];
      setOrders(data.length > 0 ? data : DEFAULT_WAITER_ORDERS);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 15000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
    } catch { Alert.alert('Error', 'Failed to update order status'); }
  };

  const activeOrders = orders.filter(o => ['pending','confirmed','preparing','ready','served'].includes(o.status));
  const completedOrders = orders.filter(o => ['completed','cancelled'].includes(o.status));
  const displayOrders = filter === 'active' ? activeOrders : completedOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.filterRow}>
          {[
            { key: 'active', label: `Active (${activeOrders.length})` },
            { key: 'done', label: `Done (${completedOrders.length})` },
          ].map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : displayOrders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
            {filter === 'active' ? 'No active orders' : 'No completed orders'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.green} />}
          renderItem={({ item: order }) => {
            const sc = STATUS_COLORS[order.status] || '#888';
            const next = NEXT_STATUS[order.status];
            return (
              <View style={[styles.orderCard, { borderLeftColor: sc, borderLeftWidth: 3 }]}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderNum}>#{order.orderNumber}</Text>
                    <Text style={styles.orderMeta}>
                      Table {order.tableId?.tableNumber || order.tableNumber} • {order.items?.length} items
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: `${sc}18` }]}>
                    <Text style={[styles.statusText, { color: sc }]}>
                      {STATUS_ICONS[order.status]} {order.status}
                    </Text>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.itemsList}>
                  {order.items?.slice(0, 3).map((item, i) => (
                    <Text key={i} style={styles.itemRow}>
                      {item.isVeg ? '🟢' : '🔴'} {item.name} ×{item.quantity}
                    </Text>
                  ))}
                  {(order.items?.length || 0) > 3 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                      +{order.items.length - 3} more
                    </Text>
                  )}
                </View>

                {order.notes && (
                  <Text style={styles.notes}>📝 {order.notes}</Text>
                )}

                <View style={styles.orderBottom}>
                  <Text style={styles.orderTotal}>₹{order.totalAmount?.toFixed(2)}</Text>
                  <View style={styles.actionBtns}>
                    {next && (
                      <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={() => updateStatus(order._id, next)}
                      >
                        <Text style={styles.nextBtnText}>
                          → {next.charAt(0).toUpperCase() + next.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => Alert.alert('Cancel Order', 'Are you sure?', [
                          { text: 'No' },
                          { text: 'Yes', onPress: () => updateStatus(order._id, 'cancelled') },
                        ])}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  filterBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  orderCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  orderMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusPill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  itemsList: { backgroundColor: colors.bgSecondary, borderRadius: radius.sm, padding: spacing.sm, marginBottom: 10, gap: 3 },
  itemRow: { fontSize: 13, color: colors.textSecondary },
  notes: { fontSize: 12, color: colors.amber, marginBottom: 10 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 17, fontWeight: '800', color: colors.green },
  actionBtns: { flexDirection: 'row', gap: 8 },
  nextBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  nextBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },
  cancelBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: colors.red },
});
