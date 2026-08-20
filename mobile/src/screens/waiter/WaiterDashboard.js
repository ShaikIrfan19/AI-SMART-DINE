import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

import { logout } from '../../store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

const STATUS_CONFIG = {
  available: { color: colors.green, bg: 'rgba(16,185,129,0.12)', label: 'Available', emoji: '🟢' },
  occupied: { color: colors.red, bg: 'rgba(239,68,68,0.12)', label: 'Occupied', emoji: '🔴' },
  reserved: { color: colors.amber, bg: 'rgba(245,158,11,0.12)', label: 'Reserved', emoji: '🟡' },
  cleaning: { color: colors.blue, bg: 'rgba(59,130,246,0.12)', label: 'Cleaning', emoji: '🔵' },
};

export function WaiterDashboard({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const [stats, setStats] = useState({ tables: [], liveOrders: [], todayOrders: 0 });
  const [callAlerts, setCallAlerts] = useState([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isActiveStatus, setIsActiveStatus] = useState(user?.isActive ?? true);

  const checkStatusAndFetchData = useCallback(async () => {
    try {
      // 1. Fetch current waiter profile to check if Admin accepted or rejected
      const meRes = await api.get('/users/profile').catch(() => null);
      if (meRes?.data?.data) {
        const currentActive = meRes.data.data.isActive;
        setIsActiveStatus(currentActive);
        if (!currentActive) {
          setLoading(false);
          return; // Stop if not accepted yet
        }
      }

      // 2. If approved, load waiter tables, orders, and call alerts
      const rid = user?.restaurantId?._id || user?.restaurantId;
      const [tabRes, orderRes, callsRes] = await Promise.all([
        rid ? api.get(`/tables?restaurantId=${rid}`) : api.get('/tables').catch(() => ({ data: { data: [] } })),
        api.get('/orders/live').catch(() => ({ data: { data: [] } })),
        api.get('/notifications/calls').catch(() => ({ data: { data: [] } })),
      ]);
      setStats({
        tables: tabRes.data.data || [],
        liveOrders: orderRes.data.data || [],
        todayOrders: orderRes.data.data?.length || 0,
      });
      setCallAlerts(callsRes.data.data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatusAndFetchData();
    const t = setInterval(checkStatusAndFetchData, 4000); // Live poll calls & orders every 4 seconds
    return () => clearInterval(t);
  }, [checkStatusAndFetchData]);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['asd_token', 'asd_user']);
    dispatch(logout());
  };

  const handleAcknowledgeCall = async (alertId) => {
    try {
      await api.patch(`/notifications/${alertId}/acknowledge`);
      setCallAlerts(prev => prev.filter(c => c._id !== alertId));
      Alert.alert('✅ Responded', 'Waiter call marked as handled!');
    } catch {
      setCallAlerts(prev => prev.filter(c => c._id !== alertId));
    }
  };

  // ─── WAITER PENDING SCREEN (LOCKED UNTIL ADMIN ACCEPTS) ───────────────────
  if (!isActiveStatus) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={{
          width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,158,11,0.15)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: colors.amber,
        }}>
          <Text style={{ fontSize: 36 }}>⏳</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
          Permission Request Sent
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 }}>
          Your waiter account is currently <Text style={{ color: colors.amber, fontWeight: '700' }}>Pending Admin Approval</Text>. Once the Restaurant Admin accepts your request, your dashboard will unlock automatically.
        </Text>

        <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, width: '100%', borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>👤 Waiter: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{user?.name}</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>📧 Email: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{user?.email}</Text></Text>
        </View>

        <TouchableOpacity
          style={{ width: '100%', padding: 15, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: colors.red, alignItems: 'center' }}
          onPress={handleLogout}
        >
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.red }}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const occupied = stats.tables.filter(t => t.status === 'occupied').length;
  const available = stats.tables.filter(t => t.status === 'available').length;

  const statCards = [
    { label: 'My Tables', val: stats.tables.length, icon: '🪑', color: colors.green },
    { label: 'Occupied', val: occupied, icon: '🔴', color: colors.red },
    { label: 'Live Orders', val: stats.liveOrders.length, icon: '📋', color: colors.amber },
    { label: 'Call Alerts', val: callAlerts.length, icon: '🔔', color: callAlerts.length > 0 ? colors.red : colors.blue },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name?.split(' ')[0]} 🍽️</Text>
          <Text style={styles.role}>Waiter Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={{ padding: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.red }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
          {/* Active Call Alert Banner (if any calls) */}
          {callAlerts.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowAlertModal(true)}
              style={{
                backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 14, padding: 14,
                borderWidth: 1.5, borderColor: colors.red, marginBottom: spacing.lg,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}
            >
              <Text style={{ fontSize: 28 }}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.red }}>
                  {callAlerts.length} Customer Call Alert{callAlerts.length > 1 ? 's' : ''}!
                </Text>
                <Text style={{ fontSize: 12, color: colors.textPrimary, marginTop: 2 }}>
                  {callAlerts[0]?.tableNumber || 'Table 1'}: {callAlerts[0]?.message}
                </Text>
              </View>
              <View style={{ backgroundColor: colors.red, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>View →</Text>
              </View>
            </TouchableOpacity>
          )}

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
              { icon: '📋', label: 'My Orders', action: () => navigation.navigate('Orders') },
              { icon: '🔔', label: `Call Alert (${callAlerts.length})`, action: () => setShowAlertModal(true) },
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

      {/* Call Alerts Modal */}
      <Modal visible={showAlertModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                🔔 Waiter Call Alerts ({callAlerts.length})
              </Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {callAlerts.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>No Pending Calls</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>When a customer bells for a waiter, calls will show here</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {callAlerts.map(alert => (
                  <View
                    key={alert._id}
                    style={{
                      backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
                      borderWidth: 1.5, borderColor: colors.red,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                        📍 {alert.tableNumber || 'Table'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                      👤 {alert.customerName}: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{alert.message}</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleAcknowledgeCall(alert._id)}
                      style={{
                        backgroundColor: colors.green, borderRadius: 10, paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#000' }}>
                        ✅ Acknowledge & Respond
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setShowAlertModal(false)}
              style={{
                marginTop: 16, backgroundColor: colors.bgCard, borderRadius: 12,
                padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.textMuted }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function WaiterTablesScreen({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  const fetchTables = useCallback(async () => {
    try {
      const rid = user?.restaurantId?._id || user?.restaurantId;
      // Fetch with restaurantId if available, otherwise fetch all tables
      const url = rid ? `/tables?restaurantId=${rid}` : '/tables';
      const res = await api.get(url);
      setTables(res.data.data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const updateStatus = async (tableId, status) => {
    try {
      await api.patch(`/tables/${tableId}/status`, { status });
      setTables(prev => prev.map(t => t._id === tableId ? { ...t, status } : t));
      setSelectedTable(prev => prev ? { ...prev, status } : prev);
    } catch { Alert.alert('Error', 'Failed to update table status'); }
  };

  const handleTablePress = (table) => setSelectedTable(table);

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: 8, backgroundColor: colors.bgCard, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontSize: 18, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1 }]}>Tables</Text>
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
      ) : tables.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🪑</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>No tables found</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Tables will appear here once added by Admin</Text>
          <TouchableOpacity onPress={fetchTables} style={{ marginTop: 16, backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ fontWeight: '700', color: '#000' }}>↻ Retry</Text>
          </TouchableOpacity>
        </View>
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
                <Text style={tableStyles.tableType}>{table.tableType} • Floor {table.floor}</Text>
                <View style={tableStyles.tableStatusRow}>
                  <View style={[tableStyles.tableDot, { backgroundColor: cfg.color }]} />
                  <Text style={[tableStyles.tableStatus, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={tableStyles.tableCap}>👥 {table.seatingCapacity} seats</Text>
                {table.status === 'occupied' && (
                  <Text style={tableStyles.tableAmt}>Tap to manage →</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Table Status Bottom Sheet Modal */}
      {selectedTable && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: colors.bgSecondary,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderWidth: 1, borderColor: colors.border,
          padding: spacing.lg, paddingBottom: 32,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12,
          elevation: 20,
        }}>
          {/* Modal Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                Table {selectedTable.tableNumber}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {selectedTable.tableType} • {selectedTable.seatingCapacity} seats • Floor {selectedTable.floor}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
              backgroundColor: (STATUS_CONFIG[selectedTable.status]?.bg || 'rgba(16,185,129,0.12)') }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: STATUS_CONFIG[selectedTable.status]?.color || colors.green }}>
                {STATUS_CONFIG[selectedTable.status]?.emoji} {STATUS_CONFIG[selectedTable.status]?.label}
              </Text>
            </View>
          </View>

          {/* Primary Action */}
          <TouchableOpacity
            onPress={() => { setSelectedTable(null); navigation.navigate('TakeOrder', { table: selectedTable }); }}
            style={{ backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#000' }}>➕ Take Order for this Table</Text>
          </TouchableOpacity>

          {/* Status Change Buttons */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Change Table Status
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                onPress={() => updateStatus(selectedTable._id, key)}
                style={{
                  flex: 1, minWidth: '44%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                  backgroundColor: selectedTable.status === key ? cfg.bg : colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: selectedTable.status === key ? cfg.color : colors.border,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: selectedTable.status === key ? cfg.color : colors.textSecondary }}>
                  {cfg.label}
                </Text>
                {selectedTable.status === key && <Text style={{ fontSize: 10, color: cfg.color }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Close */}
          <TouchableOpacity
            onPress={() => setSelectedTable(null)}
            style={{ backgroundColor: colors.bgCard, borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Close</Text>
          </TouchableOpacity>
        </View>
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
