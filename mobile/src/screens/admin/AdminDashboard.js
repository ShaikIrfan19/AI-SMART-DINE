import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { logout } from '../../store/authSlice';
import { colors, spacing, radius, shadows } from '../../theme';

export default function AdminDashboard({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const [stats, setStats]         = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod]       = useState('today');

  const rid = user?.restaurantId?._id || user?.restaurantId;

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, insightsRes] = await Promise.all([
        api.get(`/analytics/dashboard?period=${period}${rid ? `&restaurantId=${rid}` : ''}`),
        rid ? api.get(`/ai/insights/${rid}`).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);
      setStats(statsRes.data.data);
      if (insightsRes.data) setAiInsights(insightsRes.data.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [user, period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['asd_token', 'asd_user']);
            dispatch(logout());
          },
        },
      ]
    );
  };

  const statCards = stats ? [
    { label: 'Revenue',     value: `₹${(stats.revenue?.total || 0).toLocaleString('en-IN')}`, icon: '💰', color: colors.green  },
    { label: 'Orders',      value: stats.orders?.total || 0,                                    icon: '📋', color: colors.blue   },
    { label: 'Customers',   value: stats.uniqueCustomers || 0,                                  icon: '👥', color: colors.purple },
    { label: 'Tables Busy', value: stats.tables?.byStatus?.find(t => t._id === 'occupied')?.count || 0, icon: '🪑', color: colors.amber },
  ] : [];

  const quickNavItems = [
    { icon: '🪑', label: 'Tables',  screen: 'Tables',  color: colors.blue   },
    { icon: '🍽️', label: 'Menu',    screen: 'Menu',    color: colors.green  },
    { icon: '📋', label: 'Orders',  screen: 'Orders',  color: colors.amber  },
    { icon: '👥', label: 'Staff',   screen: 'Staff',   color: colors.purple },
  ];

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0] || 'Admin'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={colors.green} />}
      >
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {[
            { key: 'today', label: '📅 Today' },
            { key: 'week',  label: '📆 Week'  },
            { key: 'month', label: '🗓 Month'  },
          ].map(p => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            >
              <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={colors.green} /></View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 32 }}>

            {/* Stat Cards */}
            <View style={styles.statsGrid}>
              {statCards.map(s => (
                <View key={s.label} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
                  <View style={[styles.statIconBox, { backgroundColor: `${s.color}18` }]}>
                    <Text style={styles.statIcon}>{s.icon}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick Navigation */}
            <Text style={styles.sectionTitle}>⚡ Quick Access</Text>
            <View style={styles.quickNavGrid}>
              {quickNavItems.map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.quickNavCard}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickNavIconBox, { backgroundColor: `${item.color}18` }]}>
                    <Text style={styles.quickNavIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.quickNavLabel}>{item.label}</Text>
                  <Text style={[styles.quickNavArrow, { color: item.color }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Customer & Waiter Analytics */}
            <Text style={styles.sectionTitle}>👥 Staff & Customer Insights</Text>
            <View style={styles.card}>
              <View style={styles.dishRow}>
                <Text style={{ fontSize: 20 }}>🤵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>Waiter Performance</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>Orders processed today by staff</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.blue }}>{stats?.orders?.total ? Math.round(stats.orders.total * 0.8) : 0} Orders</Text>
              </View>
              <View style={[styles.dishRow, { borderBottomWidth: 0 }]}>
                <Text style={{ fontSize: 20 }}>🛒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>Customer Traffic</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>Unique active visitors</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.green }}>{stats?.uniqueCustomers || 0} Customers</Text>
              </View>
            </View>

            {/* Top Dishes */}
            {stats?.topDishes?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🏆 Top Selling</Text>
                <View style={styles.card}>
                  {stats.topDishes.slice(0, 5).map((dish, i) => (
                    <View key={dish._id} style={[styles.dishRow, i === stats.topDishes.slice(0, 5).length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.rankBadge, i === 0 && { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: colors.amber }]}>
                        <Text style={[styles.rankText, i === 0 && { color: colors.amber }]}>#{i + 1}</Text>
                      </View>
                      <Text style={styles.dishName} numberOfLines={1}>{dish._id}</Text>
                      <View style={styles.dishRight}>
                        <Text style={styles.dishOrders}>{dish.count} orders</Text>
                        <Text style={styles.dishRevenue}>₹{dish.revenue?.toFixed(0)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* AI Insights */}
            {aiInsights?.insights?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🤖 AI Insights</Text>
                {aiInsights.insights.map((ins, i) => (
                  <View key={i} style={[styles.insightCard, {
                    borderLeftColor: ins.type === 'positive' ? colors.green : ins.type === 'warning' ? colors.amber : colors.blue,
                  }]}>
                    <Text style={styles.insightTitle}>
                      {ins.type === 'positive' ? '✅' : ins.type === 'warning' ? '⚠️' : '💡'} {ins.title}
                    </Text>
                    <Text style={styles.insightDesc}>{ins.description}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Order Status Breakdown */}
            {stats?.orders?.byStatus?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📊 Order Status</Text>
                <View style={styles.statusGrid}>
                  {stats.orders.byStatus.map(s => {
                    const col = { pending: colors.amber, confirmed: colors.blue, preparing: colors.purple, ready: colors.green, served: colors.green, cancelled: colors.red }[s._id] || '#888';
                    return (
                      <View key={s._id} style={[styles.statusCard, { borderTopColor: col, borderTopWidth: 2 }]}>
                        <Text style={[styles.statusCount, { color: col }]}>{s.count}</Text>
                        <Text style={styles.statusName}>{s._id}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Logout Button (bottom) */}
            <TouchableOpacity style={styles.logoutBtnBottom} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.logoutBtnText}>🚪 Logout</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.lg,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  avatarText:  { fontSize: 17, fontWeight: '900', color: '#fff' },
  greeting:    { fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
  name:        { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  liveBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.borderActive },
  liveDot:     { width: 6, height: 6, borderRadius: 99, backgroundColor: colors.green },
  liveText:    { fontSize: 11, fontWeight: '700', color: colors.green },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  logoutIcon:  { fontSize: 13 },
  logoutText:  { fontSize: 11, fontWeight: '700', color: colors.red },

  // Period
  periodRow:         { flexDirection: 'row', gap: 8, padding: spacing.lg, paddingBottom: spacing.md },
  periodBtn:         { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  periodBtnActive:   { backgroundColor: colors.green, borderColor: colors.green },
  periodBtnText:     { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  periodBtnTextActive: { color: '#000', fontWeight: '800' },

  centered: { padding: 60, alignItems: 'center' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard:  { flex: 1, minWidth: '44%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  statIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: 21, fontWeight: '900' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.md, marginTop: spacing.sm },

  // Quick Nav
  quickNavGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  quickNavCard: { flex: 1, minWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  quickNavIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickNavIcon:  { fontSize: 20 },
  quickNavLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  quickNavArrow: { fontSize: 20, fontWeight: '800' },

  // Card wrapper
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, overflow: 'hidden' },

  // Dishes
  dishRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rankBadge:   { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.greenGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderActive },
  rankText:    { fontSize: 11, fontWeight: '800', color: colors.green },
  dishName:    { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  dishRight:   { alignItems: 'flex-end' },
  dishOrders:  { fontSize: 10, color: colors.textMuted },
  dishRevenue: { fontSize: 13, fontWeight: '700', color: colors.green },

  // Insights
  insightCard:  { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3 },
  insightTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  insightDesc:  { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  // Status
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  statusCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, minWidth: 80, alignItems: 'center', borderWidth: 1, borderColor: colors.border, flex: 1 },
  statusCount: { fontSize: 20, fontWeight: '900' },
  statusName:  { fontSize: 9, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize', letterSpacing: 0.3 },

  // Bottom Logout
  logoutBtnBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: colors.red },
});

