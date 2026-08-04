import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

const STATUS_CONFIG = {
  available: { color: colors.green, bg: 'rgba(16,185,129,0.12)', label: 'Available', emoji: '🟢' },
  occupied: { color: colors.red, bg: 'rgba(239,68,68,0.12)', label: 'Occupied', emoji: '🔴' },
  reserved: { color: colors.amber, bg: 'rgba(245,158,11,0.12)', label: 'Reserved', emoji: '🟡' },
  cleaning: { color: colors.blue, bg: 'rgba(59,130,246,0.12)', label: 'Cleaning', emoji: '🔵' },
};

export function WaiterDashboard({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const [stats, setStats] = useState({ tables: [], liveOrders: [], todayOrders: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const rid = user?.restaurantId?._id || user?.restaurantId;
    if (!rid) return setLoading(false);
    try {
      const [tabRes, orderRes] = await Promise.all([
        api.get(`/tables?restaurantId=${rid}`),
        api.get('/orders/live'),
      ]);
      setStats({ tables: tabRes.data.data, liveOrders: orderRes.data.data, todayOrders: orderRes.data.data.length });
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 20000); return () => clearInterval(t); }, [fetchData]);

  const occupied = stats.tables.filter(t => t.status === 'occupied').length;
  const available = stats.tables.filter(t => t.status === 'available').length;

  const statCards = [
    { label: 'My Tables', val: stats.tables.length, icon: '🪑', color: colors.green },
    { label: 'Occupied', val: occupied, icon: '🔴', color: colors.red },
    { label: 'Available', val: available, icon: '🟢', color: colors.green },
    { label: 'Live Orders', val: stats.liveOrders.length, icon: '📋', color: colors.amber },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name?.split(' ')[0]} 🍽️</Text>
          <Text style={styles.role}>Waiter Dashboard</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            {statCards.map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: '🪑', label: 'View Tables', action: () => navigation.navigate('Tables') },
              { icon: '➕', label: 'New Order', action: () => navigation.navigate('TakeOrder') },
              { icon: '📋', label: 'Orders', action: () => navigation.navigate('Orders') },
              { icon: '🔍', label: 'Scan Menu', action: () => navigation.navigate('ScanMenu') },
              { icon: '🔔', label: 'Call Alert', action: () => Alert.alert('No waiter calls at this time') },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.action} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live Orders */}
          {stats.liveOrders.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🔴 Active Orders ({stats.liveOrders.length})</Text>
              {stats.liveOrders.slice(0, 5).map(order => (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderTable}>Table {order.tableId?.tableNumber || order.tableNumber}</Text>
                    <Text style={styles.orderNum}>#{order.orderNumber}</Text>
                  </View>
                  <View style={[styles.orderStatusBadge, { backgroundColor: `${colors.amber}18` }]}>
                    <Text style={[styles.orderStatusText, { color: colors.amber }]}>{order.status}</Text>
                  </View>
                  <Text style={styles.orderAmt}>₹{order.totalAmount?.toFixed(0)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export function WaiterTablesScreen({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTables = useCallback(async () => {
    const rid = user?.restaurantId?._id || user?.restaurantId;
    if (!rid) return setLoading(false);
    try {
      const res = await api.get(`/tables?restaurantId=${rid}`);
      setTables(res.data.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const updateStatus = async (tableId, status) => {
    try {
      await api.patch(`/tables/${tableId}/status`, { status });
      setTables(prev => prev.map(t => t._id === tableId ? { ...t, status } : t));
      Alert.alert('Updated', `Table marked as ${status}`);
    } catch { Alert.alert('Error', 'Failed to update table'); }
  };

  const handleTablePress = (table) => {
    const actions = [
      { text: 'Take Order', onPress: () => navigation.navigate('TakeOrder', { table }) },
      ...(table.status !== 'available' ? [{ text: 'Mark Available', onPress: () => updateStatus(table._id, 'available') }] : []),
      { text: 'Mark Cleaning', onPress: () => updateStatus(table._id, 'cleaning') },
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert(`Table ${table.tableNumber}`, `Status: ${table.status}\nCapacity: ${table.seatingCapacity}`, actions);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tables</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); fetchTables(); }}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Status Legend */}
      <View style={tableStyles.legend}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <View key={key} style={tableStyles.legendItem}>
            <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
            <Text style={[tableStyles.legendText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={t => t._id}
          numColumns={2}
          contentContainerStyle={{ padding: spacing.md }}
          columnWrapperStyle={{ gap: spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTables(); }} tintColor={colors.green} />}
          renderItem={({ item: table }) => {
            const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
            return (
              <TouchableOpacity
                style={[tableStyles.tableCard, { borderColor: `${cfg.color}40`, backgroundColor: table.status === 'occupied' ? cfg.bg : colors.bgCard }]}
                onPress={() => handleTablePress(table)}
                activeOpacity={0.8}
              >
                <View style={[tableStyles.tableTopBar, { backgroundColor: cfg.color }]} />
                <Text style={tableStyles.tableNum}>T{table.tableNumber}</Text>
                <Text style={tableStyles.tableType}>{table.tableType} • F{table.floor}</Text>
                <View style={tableStyles.tableStatusRow}>
                  <View style={[tableStyles.tableDot, { backgroundColor: cfg.color }]} />
                  <Text style={[tableStyles.tableStatus, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={tableStyles.tableCap}>👥 {table.seatingCapacity}</Text>
                {table.status === 'occupied' && table.currentOrderId && (
                  <Text style={tableStyles.tableAmt}>₹{table.currentOrderId?.totalAmount?.toFixed(0) || '—'}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  greeting: { fontSize: 13, color: colors.textMuted },
  role: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  refreshBtn: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  refreshBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.borderActive },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: colors.green },
  liveText: { fontSize: 12, fontWeight: '700', color: colors.green },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  actionCard: { flex: 1, minWidth: '42%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  orderLeft: { flex: 1 },
  orderTable: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  orderNum: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  orderStatusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  orderStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  orderAmt: { fontSize: 15, fontWeight: '800', color: colors.green, minWidth: 56, textAlign: 'right' },
});

const tableStyles = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'space-around', padding: spacing.md, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, fontWeight: '600' },
  tableCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, paddingBottom: spacing.md },
  tableTopBar: { height: 4, width: '100%', marginBottom: spacing.md },
  tableNum: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, paddingHorizontal: spacing.md },
  tableType: { fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: 2, textTransform: 'capitalize' },
  tableStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  tableDot: { width: 7, height: 7, borderRadius: 99 },
  tableStatus: { fontSize: 12, fontWeight: '700' },
  tableCap: { fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: 4 },
  tableAmt: { fontSize: 13, fontWeight: '700', color: colors.green, paddingHorizontal: spacing.md, marginTop: 4 },
});

export default WaiterDashboard;
