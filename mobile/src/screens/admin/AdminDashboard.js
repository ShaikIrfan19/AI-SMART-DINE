import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

export default function AdminDashboard({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('today');

  const fetchStats = useCallback(async () => {
    const rid = user?.restaurantId?._id || user?.restaurantId;
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

  const statCards = stats ? [
    { label: 'Revenue', value: `₹${(stats.revenue?.total || 0).toLocaleString('en-IN')}`, icon: '💰', color: colors.green },
    { label: 'Orders', value: stats.orders?.total || 0, icon: '🍽️', color: colors.blue },
    { label: 'Customers', value: stats.uniqueCustomers || 0, icon: '👥', color: colors.purple },
    { label: 'Tables Busy', value: stats.tables?.byStatus?.find(t => t._id === 'occupied')?.count || 0, icon: '🪑', color: colors.amber },
  ] : [];

  const quickNavItems = [
    { icon: '🪑', label: 'Tables', screen: 'Tables' },
    { icon: '🍽️', label: 'Menu', screen: 'Menu' },
    { icon: '📋', label: 'Orders', screen: 'Orders' },
    { icon: '👥', label: 'Staff', screen: 'Staff' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel 📊</Text>
          <Text style={styles.subGreeting}>Hello, {user?.name?.split(' ')[0]}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={colors.green} />}
      >
        {/* Period selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }} contentContainerStyle={{ gap: 8 }}>
          {['today', 'week', 'month'].map(p => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}>
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={colors.green} /></View>
        ) : (
          <View style={{ padding: spacing.lg, paddingTop: 0 }}>
            {/* Stat Cards */}
            <View style={styles.statsGrid}>
              {statCards.map(s => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIconBox, { backgroundColor: `${s.color}18` }]}>
                    <Text style={styles.statIcon}>{s.icon}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick Navigation */}
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickNavGrid}>
              {quickNavItems.map(item => (
                <TouchableOpacity key={item.label} style={styles.quickNavCard}
                  onPress={() => navigation.navigate(item.screen)} activeOpacity={0.8}>
                  <Text style={styles.quickNavIcon}>{item.icon}</Text>
                  <Text style={styles.quickNavLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Top Dishes */}
            {stats?.topDishes?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🏆 Top Selling Today</Text>
                {stats.topDishes.slice(0, 5).map((dish, i) => (
                  <View key={dish._id} style={styles.dishRow}>
                    <View style={styles.dishRank}>
                      <Text style={styles.dishRankText}>#{i + 1}</Text>
                    </View>
                    <Text style={styles.dishName} numberOfLines={1}>{dish._id}</Text>
                    <View style={styles.dishStats}>
                      <Text style={styles.dishCount}>{dish.count} orders</Text>
                      <Text style={styles.dishRevenue}>₹{dish.revenue?.toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* AI Insights */}
            {aiInsights?.insights?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🤖 AI Insights</Text>
                {aiInsights.insights.map((insight, i) => (
                  <View key={i} style={[styles.insightCard, {
                    borderLeftColor: insight.type === 'positive' ? colors.green : insight.type === 'warning' ? colors.amber : colors.blue,
                    borderLeftWidth: 3,
                  }]}>
                    <Text style={styles.insightTitle}>
                      {insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : '💡'} {insight.title}
                    </Text>
                    <Text style={styles.insightDesc}>{insight.description}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Order Status Breakdown */}
            {stats?.orders?.byStatus?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📊 Order Status</Text>
                <View style={styles.statusGrid}>
                  {stats.orders.byStatus.map(s => (
                    <View key={s._id} style={styles.statusCard}>
                      <Text style={styles.statusCount}>{s.count}</Text>
                      <Text style={styles.statusName} numberOfLines={1}>{s._id}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  greeting: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subGreeting: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.borderActive },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: colors.green },
  liveText: { fontSize: 12, fontWeight: '700', color: colors.green },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  periodBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  periodBtnTextActive: { color: '#000' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md, marginTop: spacing.md },
  quickNavGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  quickNavCard: { flex: 1, minWidth: '44%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  quickNavIcon: { fontSize: 28, marginBottom: 8 },
  quickNavLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  dishRank: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.greenGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderActive },
  dishRankText: { fontSize: 12, fontWeight: '800', color: colors.green },
  dishName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  dishStats: { alignItems: 'flex-end' },
  dishCount: { fontSize: 11, color: colors.textMuted },
  dishRevenue: { fontSize: 13, fontWeight: '700', color: colors.green },
  insightCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  insightTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  insightDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, minWidth: 80, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statusCount: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statusName: { fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
});
