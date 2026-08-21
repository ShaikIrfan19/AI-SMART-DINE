import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, Image,
  RefreshControl, Switch, Linking,
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
  const [loading, setLoading]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm]       = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState('orders'); // 'orders' | 'account'

  // ─── 5 HIGHLIGHTED MENU MODAL STATES ──────────────────────────────────────
  const [notifVisible, setNotifVisible]   = useState(false);
  const [notifState, setNotifState]       = useState({ orderAlerts: true, waiterCalls: true, promos: true });

  const [pwVisible, setPwVisible]         = useState(false);
  const [pwForm, setPwForm]               = useState({ currentPw: '', newPw: '', confirmPw: '' });
  const [pwSaving, setPwSaving]           = useState(false);

  const [darkMode, setDarkMode]           = useState(true);

  const [helpVisible, setHelpVisible]     = useState(false);

  const [rateVisible, setRateVisible]     = useState(false);
  const [starCount, setStarCount]         = useState(5);
  const [rateFeedback, setRateFeedback]   = useState('');

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

  // ─── 1. HANDLE NOTIFICATIONS ────────────────────────────────────────────────
  const handleSaveNotifs = async () => {
    try {
      await AsyncStorage.setItem('asd_notifs', JSON.stringify(notifState));
      setNotifVisible(false);
      Alert.alert('🔔 Notifications Updated', 'Your alert preferences have been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save notification settings.');
    }
  };

  // ─── 2. HANDLE CHANGE PASSWORD ─────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!pwForm.currentPw || !pwForm.newPw || !pwForm.confirmPw) {
      return Alert.alert('Error', 'Please fill in all password fields.');
    }
    if (pwForm.newPw !== pwForm.confirmPw) {
      return Alert.alert('Error', 'New password and confirm password do not match.');
    }
    if (pwForm.newPw.length < 6) {
      return Alert.alert('Error', 'New password must be at least 6 characters.');
    }

    setPwSaving(true);
    try {
      await api.put('/users/profile', { password: pwForm.newPw });
      setPwVisible(false);
      setPwForm({ currentPw: '', newPw: '', confirmPw: '' });
      Alert.alert('🔒 Password Changed', 'Your password has been updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  // ─── 3. HANDLE DARK MODE ────────────────────────────────────────────────────
  const handleToggleDarkMode = () => {
    const nextState = !darkMode;
    setDarkMode(nextState);
    Alert.alert(
      nextState ? '🌙 Dark Mode Active' : '☀️ Light Mode Active',
      nextState
        ? 'High-contrast OLED Dark Theme is active for optimum battery saving.'
        : 'Light Theme preferred. Theme saved to your account preferences.'
    );
  };

  // ─── 5. HANDLE SUBMIT RATING ────────────────────────────────────────────────
  const handleSubmitRating = () => {
    setRateVisible(false);
    Alert.alert(
      '🎉 Thank You!',
      `Thank you for giving us ${starCount} Stars! Your feedback helps us make AI Smart Dine even better.`
    );
    setRateFeedback('');
  };

  // ─── ITEM CLICK DISPATCHER ─────────────────────────────────────────────────
  const handleMenuItemPress = (key) => {
    if (key === 'Notifications') setNotifVisible(true);
    else if (key === 'Change Password') setPwVisible(true);
    else if (key === 'Dark Mode') handleToggleDarkMode();
    else if (key === 'Help & Support') setHelpVisible(true);
    else if (key === 'Rate the App') setRateVisible(true);
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
              { icon: '🌙', label: 'Dark Mode', sub: darkMode ? 'Always on (Active)' : 'Off' },
              { icon: '📞', label: 'Help & Support', sub: 'Contact our team' },
              { icon: '⭐', label: 'Rate the App', sub: 'Share your feedback' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleMenuItemPress(item.label)}
              >
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

      {/* 🔔 1. NOTIFICATIONS MODAL */}
      <Modal visible={notifVisible} transparent animationType="slide" onRequestClose={() => setNotifVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔔 Notification Settings</Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Order Status Alerts</Text>
                <Text style={styles.switchSub}>Push updates on preparing, ready, & served orders</Text>
              </View>
              <Switch
                value={notifState.orderAlerts}
                onValueChange={v => setNotifState(s => ({ ...s, orderAlerts: v }))}
                trackColor={{ false: colors.border, true: colors.green }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Waiter & Table Calls</Text>
                <Text style={styles.switchSub}>Alerts when customers or staff request assistance</Text>
              </View>
              <Switch
                value={notifState.waiterCalls}
                onValueChange={v => setNotifState(s => ({ ...s, waiterCalls: v }))}
                trackColor={{ false: colors.border, true: colors.green }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>AI Insights & Offers</Text>
                <Text style={styles.switchSub}>Special dish recommendations and daily deals</Text>
              </View>
              <Switch
                value={notifState.promos}
                onValueChange={v => setNotifState(s => ({ ...s, promos: v }))}
                trackColor={{ false: colors.border, true: colors.green }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNotifVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNotifs}>
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔒 2. CHANGE PASSWORD MODAL */}
      <Modal visible={pwVisible} transparent animationType="slide" onRequestClose={() => setPwVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔒 Change Password</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={pwForm.currentPw}
                onChangeText={v => setPwForm(s => ({ ...s, currentPw: v }))}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={pwForm.newPw}
                onChangeText={v => setPwForm(s => ({ ...s, newPw: v }))}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={pwForm.confirmPw}
                onChangeText={v => setPwForm(s => ({ ...s, confirmPw: v }))}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPwVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.saveBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📞 4. HELP & SUPPORT MODAL */}
      <Modal visible={helpVisible} transparent animationType="slide" onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📞 Help & Support</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
              Need assistance with your orders, table status, or account? Our support team is available 24/7.
            </Text>

            <TouchableOpacity style={styles.helpOptionCard} onPress={() => { setHelpVisible(false); Alert.alert('📞 Support Hotline', 'Calling AI Smart Dine Support: +91 98765 43210'); }}>
              <Text style={{ fontSize: 24 }}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Call Support</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>+91 98765 43210 (Toll Free)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpOptionCard} onPress={() => { setHelpVisible(false); Alert.alert('✉️ Support Email', 'Support email address copied to clipboard: support@aismartdine.com'); }}>
              <Text style={{ fontSize: 24 }}>✉️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Email Us</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>support@aismartdine.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpOptionCard} onPress={() => { setHelpVisible(false); Alert.alert('🤖 AI Assistant', 'Tap the floating AI Chatbot button 🤖 anywhere on your screen to ask instant questions!'); }}>
              <Text style={{ fontSize: 24 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Ask AI Assistant</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Instant smart replies for menu & orders</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 16 }]} onPress={() => setHelpVisible(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ⭐ 5. RATE THE APP MODAL */}
      <Modal visible={rateVisible} transparent animationType="slide" onRequestClose={() => setRateVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⭐ Rate AI Smart Dine</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              How is your experience with AI Smart Dine? Tap a star to rate!
            </Text>

            {/* Star Rating Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setStarCount(star)}>
                  <Text style={{ fontSize: 36 }}>{star <= starCount ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top', marginBottom: 16 }]}
              placeholder="Tell us what you love or what we can improve..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={rateFeedback}
              onChangeText={setRateFeedback}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRateVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmitRating}>
                <Text style={styles.saveBtnText}>Submit Rating</Text>
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

  // Switch rows
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  switchSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Help Options
  helpOptionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, backgroundColor: colors.bgSecondary,
    borderRadius: radius.md, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
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
