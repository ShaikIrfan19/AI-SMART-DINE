import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { logout } from '../../store/authSlice';
import { colors, spacing, radius, shadows } from '../../theme';

const TIME_SLOTS = ['11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00', '21:00 - 23:00'];
const TABLE_TYPES = ['regular', 'couple', 'family', 'vip', 'window', 'outdoor'];
const TABLE_TYPE_ICONS = { regular: '🪑', couple: '💑', family: '👨‍👩‍👧', vip: '👑', window: '🪟', outdoor: '🌿' };

const SHARED_RESTAURANT_ID = '60d0fe4f5311236168a109ca';

export function ReservationScreen() {
  const { user } = useSelector(s => s.auth);
  const [form, setForm] = useState({
    customerName: user?.name || '',
    customerPhone: user?.phone || '',
    customerEmail: user?.email || '',
    guestCount: 2,
    tableType: 'regular',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '19:00 - 21:00',
    specialRequests: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [showNew, setShowNew] = useState(false);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/reservations');
      setReservations(res.data.data || []);
    } catch {} finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleSubmit = async () => {
    const selectedDate = form.date || new Date().toISOString().split('T')[0];
    if (!form.timeSlot) return Alert.alert('Error', 'Please select a time slot');
    setLoading(true);
    const rid = user?.restaurantId?._id || user?.restaurantId || SHARED_RESTAURANT_ID;
    try {
      const res = await api.post('/reservations', {
        ...form,
        date: selectedDate,
        restaurantId: rid,
      });
      const newRes = res.data.data;
      if (newRes) {
        setReservations(prev => [newRes, ...prev]);
      }
      setShowNew(false);
      Alert.alert('Reservation Confirmed! 🎉', `Your reservation #${newRes?.reservationNumber || ''} has been created.`);
      setForm({ ...form, specialRequests: '' });
      fetchReservations();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Reservation failed');
    } finally { setLoading(false); }
  };

  const cancelReservation = (id) => {
    Alert.alert('Cancel Reservation', 'Are you sure you want to cancel?', [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/reservations/${id}`);
          setReservations(prev => prev.filter(r => r._id !== id));
        } catch { Alert.alert('Error', 'Failed to cancel reservation'); }
      }},
    ]);
  };

  // Helper for quick date chips
  const getDateOffsetStr = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getDateOffsetStr(0);
  const tomorrowStr = getDateOffsetStr(1);
  const dayAfterStr = getDateOffsetStr(2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗓 Reservations</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(!showNew)}>
          <Text style={styles.newBtnText}>{showNew ? '✕ Close' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReservations(); }} tintColor={colors.green} />}
      >
        {showNew && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Table Reservation</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Guest Count</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <TouchableOpacity key={n} style={[styles.numChip, form.guestCount === n && styles.numChipActive]} onPress={() => setForm({ ...form, guestCount: n })}>
                    <Text style={[styles.numChipText, form.guestCount === n && styles.numChipTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Table Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {TABLE_TYPES.map(t => (
                    <TouchableOpacity key={t} style={[styles.typeChip, form.tableType === t && styles.typeChipActive]} onPress={() => setForm({ ...form, tableType: t })}>
                      <Text style={styles.typeEmoji}>{TABLE_TYPE_ICONS[t]}</Text>
                      <Text style={[styles.typeText, form.tableType === t && styles.typeTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              {/* Quick Date Chips */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {[
                  { label: 'Today', val: todayStr },
                  { label: 'Tomorrow', val: tomorrowStr },
                  { label: 'Day After', val: dayAfterStr },
                ].map(d => (
                  <TouchableOpacity
                    key={d.label}
                    style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border },
                      form.date === d.val && { backgroundColor: colors.green, borderColor: colors.green }]}
                    onPress={() => setForm({ ...form, date: d.val })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }, form.date === d.val && { color: '#000' }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={form.date}
                onChangeText={v => setForm({ ...form, date: v })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time Slot</Text>
              {TIME_SLOTS.map(t => (
                <TouchableOpacity key={t} style={[styles.slotBtn, form.timeSlot === t && styles.slotBtnActive]} onPress={() => setForm({ ...form, timeSlot: t })}>
                  <Text style={[styles.slotText, form.timeSlot === t && { color: colors.green, fontWeight: '700' }]}>🕐 {t}</Text>
                  {form.timeSlot === t && <Text style={{ color: colors.green }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Special Requests</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Birthday, anniversary, dietary..." placeholderTextColor={colors.textMuted} value={form.specialRequests} onChangeText={v => setForm({ ...form, specialRequests: v })} multiline />
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Confirm Reservation →</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>My Reservations ({reservations.length})</Text>
        {fetching ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: 24 }} />
        ) : reservations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>No reservations yet</Text>
            <TouchableOpacity style={{ marginTop: 12, backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => setShowNew(true)}>
              <Text style={{ fontWeight: '800', color: '#000', fontSize: 13 }}>+ Book a Table</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reservations.map(r => (
            <View key={r._id} style={styles.reservCard}>
              <View style={[styles.reservStatus, { backgroundColor: r.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: r.status === 'confirmed' ? colors.green : colors.amber, textTransform: 'capitalize' }}>{r.status}</Text>
              </View>
              <Text style={styles.reservNumber}>#{r.reservationNumber}</Text>
              <Text style={styles.reservDetail}>📅 {new Date(r.date).toLocaleDateString('en-IN')} • ⏰ {r.timeSlot}</Text>
              <Text style={styles.reservDetail}>👥 {r.guestCount} guests • {TABLE_TYPE_ICONS[r.tableType]} {r.tableType}</Text>
              {r.specialRequests && <Text style={styles.reservDetail}>📝 {r.specialRequests}</Text>}
              {['pending', 'confirmed'].includes(r.status) && (
                <TouchableOpacity onPress={() => cancelReservation(r._id)}>
                  <Text style={{ fontSize: 12, color: colors.red, fontWeight: '700', marginTop: 8 }}>Cancel Reservation</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export function ProfileScreen({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['asd_token', 'asd_user']);
        dispatch(logout());
      }},
    ]);
  };

  const menuItems = [
    { icon: '📋', label: 'Order History', action: () => {} },
    { icon: '🪑', label: 'My Reservations', action: () => {} },
    { icon: '🎟', label: 'My Coupons', action: () => {} },
    { icon: '⭐', label: 'My Reviews', action: () => {} },
    { icon: '🔔', label: 'Notifications', action: () => {} },
    { icon: '🔒', label: 'Change Password', action: () => {} },
    { icon: '📞', label: 'Help & Support', action: () => {} },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingBottom: 24 }]}>
        <View style={pStyles.avatarBox}>
          <Text style={pStyles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <View>
          <Text style={pStyles.userName}>{user?.name}</Text>
          <Text style={pStyles.userEmail}>{user?.email}</Text>
          <View style={pStyles.roleBadge}>
            <Text style={pStyles.roleText}>{user?.role?.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {menuItems.map(item => (
          <TouchableOpacity key={item.label} style={pStyles.menuItem} onPress={item.action} activeOpacity={0.7}>
            <Text style={pStyles.menuIcon}>{item.icon}</Text>
            <Text style={pStyles.menuLabel}>{item.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={pStyles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={pStyles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 24 }}>AI Smart Dine v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  newBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  formCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  formTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: 14, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  numChip: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  numChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  numChipText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  numChipTextActive: { color: '#000' },
  typeChip: { alignItems: 'center', padding: 10, borderRadius: radius.md, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, minWidth: 70 },
  typeChipActive: { borderColor: colors.green, backgroundColor: colors.greenGlow },
  typeEmoji: { fontSize: 22 },
  typeText: { fontSize: 11, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  typeTextActive: { color: colors.green, fontWeight: '700' },
  slotBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  slotBtnActive: { borderColor: colors.borderActive, backgroundColor: colors.greenGlow },
  slotText: { fontSize: 14, color: colors.textSecondary },
  submitBtn: { backgroundColor: colors.green, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8, ...shadows.green },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  emptyBox: { alignItems: 'center', padding: 40 },
  reservCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  reservStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginBottom: 8 },
  reservNumber: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  reservDetail: { fontSize: 13, color: colors.textMuted, marginBottom: 3 },
});

const pStyles = StyleSheet.create({
  avatarBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginRight: 16, ...shadows.green },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  roleBadge: { backgroundColor: colors.greenGlow, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6, borderWidth: 1, borderColor: colors.borderActive },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.green, textTransform: 'capitalize' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.red },
});

export default ReservationScreen;
