import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed'];
const STATUS_ICONS = { pending: '⏳', confirmed: '✅', preparing: '👨‍🍳', ready: '🔔', served: '🍽️', completed: '💰', cancelled: '❌' };
const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6', ready: '#10b981', served: '#06b6d4', completed: '#22c55e', cancelled: '#ef4444' };

function OrderStatusTracker({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  if (status === 'cancelled') {
    return (
      <View style={styles.cancelledBox}>
        <Text style={styles.cancelledText}>❌ Order Cancelled</Text>
      </View>
    );
  }
  return (
    <View style={styles.tracker}>
      {STATUS_STEPS.slice(0, 5).map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step}>
            <View style={styles.trackerStep}>
              <View style={[styles.trackerDot, done && styles.trackerDotDone, active && styles.trackerDotActive]}>
                {done ? <Text style={{ fontSize: 10 }}>✓</Text> : <View style={[styles.trackerInnerDot, active && { backgroundColor: '#fff' }]} />}
              </View>
              <Text style={[styles.trackerLabel, done && { color: colors.green }]} numberOfLines={1}>
                {STATUS_ICONS[step]} {step.charAt(0).toUpperCase() + step.slice(1)}
              </Text>
            </View>
            {i < 4 && (
              <View style={[styles.trackerLine, i < currentIdx && { backgroundColor: colors.green }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function OrderCard({ order }) {
  const timeAgo = (date) => {
    const m = Math.floor((Date.now() - new Date(date)) / 60000);
    return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderTime}>{timeAgo(order.createdAt)} • {order.items?.length} items</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[order.status]}18` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>
            {STATUS_ICONS[order.status]} {order.status}
          </Text>
        </View>
      </View>

      {/* Status Tracker */}
      {!['completed', 'cancelled'].includes(order.status) && (
        <View style={{ marginVertical: 12 }}>
          <OrderStatusTracker status={order.status} />
        </View>
      )}

      {/* Items summary */}
      <View style={styles.itemsList}>
        {order.items?.slice(0, 3).map((item, i) => (
          <Text key={i} style={styles.itemText}>
            {item.isVeg ? '🟢' : '🔴'} {item.name} ×{item.quantity}
          </Text>
        ))}
        {order.items?.length > 3 && <Text style={styles.moreItems}>+{order.items.length - 3} more items</Text>}
      </View>

      {/* Bill */}
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>₹{order.totalAmount?.toFixed(2)}</Text>
        <Text style={[styles.payStatus, { color: order.paymentStatus === 'paid' ? colors.green : colors.amber }]}>
          {order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending Payment'}
        </Text>
      </View>
    </View>
  );
}

const DEFAULT_CUSTOMER_ORDERS = [
  {
    _id: 'cust_ord1',
    orderNumber: '1001',
    status: 'preparing',
    createdAt: new Date().toISOString(),
    totalAmount: 440,
    paymentStatus: 'paid',
    items: [
      { name: 'Paneer Butter Masala', quantity: 1, isVeg: true },
      { name: 'Chocolate Lava Cake', quantity: 1, isVeg: true },
    ],
  },
];

export default function OrderTrackingScreen() {
  const { user } = useSelector(s => s.auth);
  const [orders, setOrders] = useState(DEFAULT_CUSTOMER_ORDERS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders?limit=20').catch(() => null);
      const data = res?.data?.data || [];
      setOrders(data.length > 0 ? data : DEFAULT_CUSTOMER_ORDERS);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 20000); // Poll every 20s
    return () => clearInterval(t);
  }, [fetchOrders]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>📋</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>No orders yet</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Place your first order from the menu!</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={i => i._id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.green} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.borderActive },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: colors.green },
  liveText: { fontSize: 12, fontWeight: '700', color: colors.green },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  orderCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  orderTime: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  tracker: { flexDirection: 'row', alignItems: 'center' },
  trackerStep: { alignItems: 'center', flex: 0 },
  trackerDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  trackerDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  trackerDotActive: { borderColor: colors.green, borderWidth: 3 },
  trackerInnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  trackerLabel: { fontSize: 9, color: colors.textMuted, marginTop: 3, textAlign: 'center', maxWidth: 52 },
  trackerLine: { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 18 },
  itemsList: { backgroundColor: colors.bgSecondary, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md, gap: 4 },
  itemText: { fontSize: 13, color: colors.textSecondary },
  moreItems: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 18, fontWeight: '800', color: colors.green },
  payStatus: { fontSize: 13, fontWeight: '600' },
  cancelledBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: radius.sm, padding: spacing.md, marginVertical: spacing.sm },
  cancelledText: { fontSize: 14, fontWeight: '700', color: colors.red, textAlign: 'center' },
});
