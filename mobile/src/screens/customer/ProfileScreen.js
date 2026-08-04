import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, Image,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { logout, setCredentials } from '../../store/authSlice';
import { colors, spacing, radius, shadows } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();

  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm]       = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState('orders'); // 'orders' | 'account'

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders?limit=20');
      setOrders(res.data.data || []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['asd_token', 'asd_user']);
        dispatch(logout());
      }},
    ]);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/profile', editForm);
      const updatedUser = { ...user, ...res.data.data };
      await AsyncStorage.setItem('asd_user', JSON.stringify(updatedUser));
      dispatch(setCredentials({ token: await AsyncStorage.getItem('asd_token'), user: updatedUser }));
      setEditVisible(false);
      Alert.alert('✅ Success', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const statusColor = {
    pending: colors.amber,
    confirmed: colors.blue,
    preparing: colors.purple,
    ready: colors.green,
    served: colors.green,
    cancelled: colors.red,
  };

  const statusEmoji = {
    pending: '⏳', confirmed: '✅', preparing: '👨‍🍳', ready: '🔔', served: '🍽️', cancelled: '❌',
  };

  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>🍽️ {user?.role?.replace('_', ' ')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{orders.filter(o => o.status !== 'cancelled').length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>₹{totalSpent.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{orders.filter(o => o.status === 'served').length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'orders', label: '📋 Order History' },
          { key: 'account', label: '👤 Account' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.green} />}
      >

        {/* ORDER HISTORY TAB */}
        {activeTab === 'orders' && (
          <>
            {loading ? (
              <View style={styles.centered}><ActivityIndicator color={colors.green} size="large" /></View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptyText}>Your order history will appear here once you place your first order.</Text>
              </View>
            ) : (
              orders.map(order => (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <View>
                      <Text style={styles.orderNum}>#{order.orderNumber}</Text>
                      <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor[order.status] || '#888'}18`, borderColor: `${statusColor[order.status] || '#888'}40` }]}>
                      <Text style={{ fontSize: 12 }}>{statusEmoji[order.status]}</Text>
                      <Text style={[styles.statusText, { color: statusColor[order.status] || '#888' }]}>{order.status}</Text>
                    </View>
                  </View>
                  <View style={styles.orderDivider} />
                  <View style={styles.orderBottom}>
                    <Text style={styles.orderItems}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</Text>
                    <Text style={styles.orderAmt}>₹{(order.totalAmount || 0).toFixed(0)}</Text>
                  </View>
                  {order.items?.slice(0, 2).map((item, idx) => (
                    <Text key={idx} style={styles.orderItemName}>• {item.name} × {item.quantity}</Text>
                  ))}
                  {order.items?.length > 2 && (
                    <Text style={styles.orderMore}>+{order.items.length - 2} more</Text>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <>
            {/* Account info card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Account Information</Text>
              {[
                { label: 'Full Name', value: user?.name },
                { label: 'Email', value: user?.email },
                { label: 'Phone', value: user?.phone || '—' },
                { label: 'Role', value: user?.role?.replace('_', ' ') },
                { label: 'Email Verified', value: user?.isEmailVerified ? '✅ Yes' : '❌ No' },
              ].map(row => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Menu items */}
            {[
              { icon: '🔔', label: 'Notifications', sub: 'Manage your alerts' },
              { icon: '🔒', label: 'Change Password', sub: 'Update your password' },
              { icon: '🌙', label: 'Dark Mode', sub: 'Always on' },
              { icon: '📞', label: 'Help & Support', sub: 'Contact our team' },
              { icon: '⭐', label: 'Rate the App', sub: 'Share your feedback' },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
                <View style={styles.menuIconBox}><Text style={{ fontSize: 20 }}>{item.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.logoutText}>🚪 Logout</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>AI Smart Dine v1.0.0 • Powered by Gemini AI</Text>
          </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            {[
              { label: 'Full Name', key: 'name', placeholder: 'Your full name' },
              { label: 'Phone', key: 'phone', placeholder: '10-digit phone number' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={editForm[f.key]}
                  onChangeText={v => setEditForm(prev => ({ ...prev, [f.key]: v }))}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  // Header
  header: {
    backgroundColor: colors.bgSecondary,
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: spacing.lg },
  avatarBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.green,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.borderActive,
  },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.green, textTransform: 'capitalize' },
  editBtn: {
    backgroundColor: colors.bgCard, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.green },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.green, fontWeight: '700' },

  // Orders
  orderCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  orderDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  orderDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItems: { fontSize: 12, color: colors.textMuted },
  orderAmt: { fontSize: 16, fontWeight: '800', color: colors.green },
  orderItemName: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  orderMore: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Account tab
  infoCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  infoCardTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: spacing.md, backgroundColor: colors.bgCard,
    borderRadius: radius.md, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  menuIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  menuSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radius.md, padding: 16,
    alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.red },
  versionText: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 24 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgSecondary, borderRadius: radius.md,
    padding: 13, color: colors.textPrimary,
    fontSize: 14, borderWidth: 1, borderColor: colors.border,
  },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText: { fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.green, alignItems: 'center' },
  saveBtnText: { fontWeight: '800', color: '#000' },
});
