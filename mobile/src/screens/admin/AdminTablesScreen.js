// AdminTablesScreen — full table management for admin
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

const STATUS_CFG = {
  available: { color: colors.green, emoji: '🟢', label: 'Available' },
  occupied:  { color: colors.red,   emoji: '🔴', label: 'Occupied'  },
  reserved:  { color: colors.amber, emoji: '🟡', label: 'Reserved'  },
  cleaning:  { color: colors.blue,  emoji: '🔵', label: 'Cleaning'  },
};

export function AdminTablesScreen() {
  const { user } = useSelector(s => s.auth);
  const [tables, setTables]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ tableNumber: '', seatingCapacity: '4', floor: '1', tableType: 'regular' });

  const restaurantId = user?.restaurantId?._id || user?.restaurantId || user?.id;

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return setLoading(false);
    try {
      const res = await api.get(`/tables?restaurantId=${restaurantId}`);
      setTables(res.data.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const changeStatus = async (tableId, status) => {
    try {
      await api.patch(`/tables/${tableId}/status`, { status });
      setTables(prev => prev.map(t => t._id === tableId ? { ...t, status } : t));
    } catch { Alert.alert('Error', 'Failed to update'); }
  };

  const handleTablePress = (table) => {
    Alert.alert(`Table ${table.tableNumber}`, `Status: ${table.status}\nCapacity: ${table.seatingCapacity} seats`, [
      { text: '🟢 Available', onPress: () => changeStatus(table._id, 'available') },
      { text: '🔵 Cleaning',  onPress: () => changeStatus(table._id, 'cleaning')  },
      { text: '🗑 Delete',    style: 'destructive', onPress: () => deleteTable(table._id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteTable = async (id) => {
    try {
      await api.delete(`/tables/${id}`);
      setTables(prev => prev.filter(t => t._id !== id));
      Alert.alert('Deleted', 'Table removed');
    } catch { Alert.alert('Error', 'Cannot delete table with active orders'); }
  };

  const addTable = async () => {
    if (!form.tableNumber) return Alert.alert('Error', 'Table number required');
    try {
      const res = await api.post('/tables', {
        restaurantId,
        tableNumber: form.tableNumber,
        seatingCapacity: +form.seatingCapacity,
        floor: +form.floor,
        tableType: form.tableType,
      });
      setTables(prev => [...prev, res.data.data]);
      setShowAdd(false);
      setForm({ tableNumber: '', seatingCapacity: '4', floor: '1', tableType: 'regular' });
      Alert.alert('✅ Success', 'Table added successfully');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
  };

  const summary = Object.entries(STATUS_CFG).map(([k, v]) => ({
    ...v, key: k, count: tables.filter(t => t.status === k).length,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tables ({tables.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {summary.map(s => (
          <View key={s.key} style={[styles.summaryChip, { backgroundColor: `${s.color}12` }]}>
            <Text style={{ fontSize: 12 }}>{s.emoji}</Text>
            <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading ? <View style={styles.centered}><ActivityIndicator color={colors.green} /></View> : (
        <FlatList
          data={tables}
          keyExtractor={t => t._id}
          numColumns={2}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 24 }}
          columnWrapperStyle={{ gap: spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTables(); }} tintColor={colors.green} />}
          renderItem={({ item: t }) => {
            const cfg = STATUS_CFG[t.status] || STATUS_CFG.available;
            return (
              <TouchableOpacity style={[styles.tableCard, { borderColor: `${cfg.color}40` }]} onPress={() => handleTablePress(t)} activeOpacity={0.8}>
                <View style={[styles.tableBar, { backgroundColor: cfg.color }]} />
                <Text style={styles.tableNum}>T{t.tableNumber}</Text>
                <Text style={styles.tableSub}>{t.tableType} • F{t.floor}</Text>
                <View style={styles.tableStatus}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={styles.tableCap}>👥 {t.seatingCapacity}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Add Table Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add New Table</Text>
            {[
              { label: 'Table Number', key: 'tableNumber', placeholder: 'e.g. 1, A1, VIP-1', kbType: 'default' },
              { label: 'Seating Capacity', key: 'seatingCapacity', placeholder: '4', kbType: 'numeric' },
              { label: 'Floor Number', key: 'floor', placeholder: '1', kbType: 'numeric' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={form[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.kbType}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={addTable}>
                <Text style={styles.modalConfirmText}>Add Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── AdminMenuScreen ──────────────────────────────────────────────────────────
export function AdminMenuScreen() {
  const { user } = useSelector(s => s.auth);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', price: '', category: 'starters', description: '' });

  const restaurantId = user?.restaurantId?._id || user?.restaurantId || user?.id;
  const CATS = ['all','starters','main_course','desserts','drinks','combos','snacks'];

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = new URLSearchParams({ restaurantId });
        if (category !== 'all') params.set('category', category);
        const res = await api.get(`/menu?${params}`);
        setItems(res.data.data);
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, [category, restaurantId]);

  const addItem = async () => {
    if (!form.name || !form.price) return Alert.alert('Error', 'Name and price are required');
    // Map common typos to valid categories
    let finalCategory = form.category.toLowerCase().replace(/ /g, '_');
    if (finalCategory === 'main') finalCategory = 'main_course';
    if (!CATS.includes(finalCategory) && finalCategory !== 'all') {
      finalCategory = 'starters'; // fallback
    }

    try {
      const res = await api.post('/menu', {
        restaurantId,
        name: form.name,
        price: Number(form.price),
        category: finalCategory,
        description: form.description,
      });
      setItems(prev => [res.data.data, ...prev]);
      setShowAdd(false);
      setForm({ name: '', price: '', category: 'starters', description: '' });
      Alert.alert('✅ Success', 'Item added successfully');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
  };

  const toggleAvailability = async (id, current) => {
    try {
      await api.patch(`/menu/${id}/availability`);
      setItems(prev => prev.map(i => i._id === id ? { ...i, isAvailable: !current } : i));
    } catch { Alert.alert('Error', 'Failed to update'); }
  };

  const deleteItem = async (id) => {
    Alert.alert('Delete Dish', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/menu/${id}`);
        setItems(prev => prev.filter(i => i._id !== id));
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu ({items.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={CATS}
        keyExtractor={c => c}
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 48, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, alignItems: 'center' }}
        renderItem={({ item: c }) => (
          <TouchableOpacity onPress={() => setCategory(c)}
            style={[styles.catChip, category === c && styles.catChipActive]}>
            <Text style={[styles.catText, category === c && styles.catTextActive]}>
              {c.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      />
      {loading ? <View style={styles.centered}><ActivityIndicator color={colors.green} /></View> : (
        <FlatList
          data={items}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={[styles.menuCard, !item.isAvailable && { opacity: 0.55 }]}>
              <View style={styles.menuEmoji}>
                <Text style={{ fontSize: 28 }}>{item.isVeg ? '🥗' : '🍗'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.menuCat}>{item.category?.replace('_', ' ')}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                  <Text style={styles.menuPrice}>₹{item.price}</Text>
                  {item.isPopular && <Text style={{ fontSize: 11, color: colors.amber }}>🔥 Popular</Text>}
                </View>
              </View>
              <View style={styles.menuActions}>
                <TouchableOpacity onPress={() => toggleAvailability(item._id, item.isAvailable)}
                  style={[styles.availBtn, { backgroundColor: item.isAvailable ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: item.isAvailable ? colors.green : colors.red }}>
                    {item.isAvailable ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item._id)} style={styles.delBtn}>
                  <Text style={{ fontSize: 14 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Menu Item Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add New Menu Item</Text>
            {[
              { label: 'Item Name', key: 'name', placeholder: 'e.g. Garlic Bread', kbType: 'default' },
              { label: 'Price', key: 'price', placeholder: '150', kbType: 'numeric' },
              { label: 'Category', key: 'category', placeholder: 'starters, main_course, etc.', kbType: 'default' },
              { label: 'Description', key: 'description', placeholder: 'Item description...', kbType: 'default' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={form[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.kbType}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={addItem}>
                <Text style={styles.modalConfirmText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── AdminOrdersScreen ────────────────────────────────────────────────────────
export function AdminOrdersScreen() {
  const { user } = useSelector(s => s.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rid = user?.restaurantId?._id || user?.restaurantId;
    api.get(`/orders?restaurantId=${rid}&limit=50`)
      .then(r => setOrders(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
  };

  const SCOL = { pending: colors.amber, confirmed: colors.blue, preparing: colors.purple, ready: colors.green, served: '#06b6d4', completed: '#22c55e', cancelled: colors.red };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>All Orders</Text></View>
      {loading ? <View style={styles.centered}><ActivityIndicator color={colors.green} /></View> : (
        <FlatList
          data={orders}
          keyExtractor={o => o._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 24 }}
          renderItem={({ item: o }) => (
            <View style={[styles.orderCard, { borderLeftColor: SCOL[o.status] || '#888', borderLeftWidth: 3 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: colors.textPrimary }}>#{o.orderNumber}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: SCOL[o.status], textTransform: 'capitalize' }}>{o.status}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
                Table {o.tableId?.tableNumber || o.tableNumber} • {o.items?.length} items
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.green }}>₹{o.totalAmount?.toFixed(0)}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {o.status === 'pending' && <TouchableOpacity style={styles.actionMiniBtn} onPress={() => updateStatus(o._id, 'confirmed')}><Text style={styles.actionMiniText}>Confirm</Text></TouchableOpacity>}
                  {o.status === 'confirmed' && <TouchableOpacity style={styles.actionMiniBtn} onPress={() => updateStatus(o._id, 'preparing')}><Text style={styles.actionMiniText}>Prepare</Text></TouchableOpacity>}
                  {o.status === 'preparing' && <TouchableOpacity style={styles.actionMiniBtn} onPress={() => updateStatus(o._id, 'ready')}><Text style={styles.actionMiniText}>Ready ✓</Text></TouchableOpacity>}
                  {o.status === 'ready' && <TouchableOpacity style={styles.actionMiniBtn} onPress={() => updateStatus(o._id, 'served')}><Text style={styles.actionMiniText}>Served</Text></TouchableOpacity>}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─── AdminStaffScreen ─────────────────────────────────────────────────────────
export function AdminStaffScreen() {
  const { user } = useSelector(s => s.auth);
  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', phone: '', password: '' });

  const fetchStaff = async () => {
    try {
      const r = await api.get('/staff');
      let data = r.data.data || [];
      if (!data.length) {
        const u = await api.get('/users?role=waiter').catch(() => ({ data: { data: [] } }));
        data = u.data.data || [];
      }
      setStaff(data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchStaff();
    const timer = setInterval(fetchStaff, 8000); // Live poll staff every 8s
    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = async (id, name, approve) => {
    try {
      await api.patch(`/staff/${id}/status`, { isActive: approve });
      setStaff(prev => prev.map(s => s._id === id ? { ...s, isActive: approve } : s));
      Alert.alert(approve ? '✅ Approved' : '❌ Access Revoked', `Waiter ${name} ${approve ? 'can now access the Waiter Dashboard' : 'has been rejected'}`);
    } catch {
      Alert.alert('Error', 'Failed to update waiter access');
    }
  };

  const addStaff = async () => {
    if (!form.name || !form.email || !form.password) return Alert.alert('Error', 'Name, email and password are required');
    try {
      const res = await api.post('/staff', { ...form, role: 'waiter' });
      setStaff(prev => [res.data.data, ...prev]);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', password: '' });
      Alert.alert('✅ Success', 'Waiter created successfully!');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed to create waiter'); }
  };

  const pendingWaiters = staff.filter(s => !s.isActive);
  const activeWaiters  = staff.filter(s => s.isActive);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Permissions ({staff.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add Waiter</Text>
        </TouchableOpacity>
      </View>

      {loading ? <View style={styles.centered}><ActivityIndicator color={colors.green} /></View> : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStaff(); }} tintColor={colors.green} />}
        >
          {/* Pending Approval Section */}
          {pendingWaiters.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.amber, marginBottom: 8 }]}>
                ⏳ Pending Waiter Requests ({pendingWaiters.length})
              </Text>
              {pendingWaiters.map(member => (
                <View key={member._id} style={[styles.staffCard, { flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 14, borderColor: colors.amber, borderWidth: 1.5, marginBottom: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.staffAvatar, { backgroundColor: 'rgba(245,158,11,0.2)' }]}>
                      <Text style={[styles.staffAvatarText, { color: colors.amber }]}>{member.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>{member.name}</Text>
                      <Text style={styles.staffEmail} numberOfLines={1}>{member.email}</Text>
                      <Text style={{ fontSize: 11, color: colors.amber, fontWeight: '700', marginTop: 2 }}>⚠️ Requesting Dashboard Access</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => handleStatusChange(member._id, member.name, true)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.green, alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#000' }}>✓ Accept & Grant Access</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleStatusChange(member._id, member.name, false)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: colors.red, alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.red }}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Active Waiters Section */}
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
            👥 Active Waiters & Staff ({activeWaiters.length})
          </Text>
          {activeWaiters.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>No active staff members found.</Text>
          ) : (
            activeWaiters.map(member => (
              <View key={member._id} style={[styles.staffCard, { marginBottom: 10 }]}>
                <View style={styles.staffAvatar}><Text style={styles.staffAvatarText}>{member.name?.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role?.replace('_', ' ')}</Text>
                  <Text style={styles.staffEmail} numberOfLines={1}>{member.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleStatusChange(member._id, member.name, false)}
                  style={[styles.staffToggle, { backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 12, paddingVertical: 6 }]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.red }}>
                    Revoke Access
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Staff Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create Waiter Account</Text>
            {[
              { label: 'Full Name', key: 'name', placeholder: 'John Doe', secure: false },
              { label: 'Email', key: 'email', placeholder: 'waiter@test.com', secure: false },
              { label: 'Phone', key: 'phone', placeholder: '+91', secure: false },
              { label: 'Password', key: 'password', placeholder: 'Secret password', secure: true },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={form[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  secureTextEntry={f.secure}
                  autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={addStaff}>
                <Text style={styles.modalConfirmText}>Create Waiter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', padding: spacing.sm, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryChip: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, gap: 2 },
  summaryCount: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 9, color: colors.textMuted, textTransform: 'uppercase' },
  tableCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, paddingBottom: spacing.md },
  tableBar: { height: 4, width: '100%', marginBottom: spacing.md },
  tableNum: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, paddingHorizontal: spacing.md },
  tableSub: { fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: 2, textTransform: 'capitalize' },
  tableStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: '700' },
  tableCap: { fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'flex-end' },
  modal: { width: '100%', backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: 13, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: colors.textSecondary },
  modalConfirmBtn: { flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.green, alignItems: 'center' },
  modalConfirmText: { fontWeight: '800', color: '#000' },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  catText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  catTextActive: { color: '#000' },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  menuEmoji: { width: 52, height: 52, backgroundColor: colors.bgSecondary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  menuCat: { fontSize: 11, color: colors.textMuted, textTransform: 'capitalize', marginTop: 1 },
  menuPrice: { fontSize: 14, fontWeight: '800', color: colors.green },
  menuActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  availBtn: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  delBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  orderCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  actionMiniBtn: { backgroundColor: colors.green, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 6 },
  actionMiniText: { fontSize: 11, fontWeight: '800', color: '#000' },
  staffCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  staffAvatar: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  staffAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  staffName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  staffRole: { fontSize: 11, color: colors.green, textTransform: 'capitalize', fontWeight: '600' },
  staffEmail: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  staffToggle: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
});

export default AdminTablesScreen;
