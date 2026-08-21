import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { addItem, clearCart, selectCartTotal, selectCartCount } from '../../store/cartSlice';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

const CATEGORIES = ['all', 'starters', 'main_course', 'desserts', 'drinks', 'combos', 'snacks'];

const CAT_LABELS = {
  all: 'All',
  starters: 'Starters',
  main_course: 'Main Course',
  desserts: 'Desserts',
  drinks: 'Drinks',
  combos: 'Combos',
  snacks: 'Snacks',
};

const DEFAULT_TAKE_ORDER_MENU = [
  { _id: 'def1', name: 'Paneer Butter Masala', price: 280, category: 'main_course', description: 'Rich creamy cottage cheese gravy infused with spices.', isVeg: true, isAvailable: true, isPopular: true },
  { _id: 'def2', name: 'Chicken Biryani', price: 340, category: 'main_course', description: 'Hyderabadi style slow cooked aromatic basmati rice.', isVeg: false, isAvailable: true, isPopular: true },
  { _id: 'def3', name: 'Crispy Veg Spring Rolls', price: 190, category: 'starters', description: 'Golden crunchy spring rolls served with chilli dip.', isVeg: true, isAvailable: true },
  { _id: 'def4', name: 'Tandoori Chicken Wings', price: 290, category: 'starters', description: 'Juicy chicken wings marinated in tandoori spices.', isVeg: false, isAvailable: true },
  { _id: 'def5', name: 'Chocolate Lava Cake', price: 160, category: 'desserts', description: 'Warm chocolate cake with molten chocolate core.', isVeg: true, isAvailable: true, isPopular: true },
  { _id: 'def6', name: 'Fresh Mint Mojito', price: 130, category: 'drinks', description: 'Chilled refreshing lime and mint cooler.', isVeg: true, isAvailable: true },
];

export default function TakeOrderScreen({ navigation, route }) {
  const { table } = route.params || {};
  const dispatch = useDispatch();
  const { items: cartItems } = useSelector(s => s.cart);
  const { user } = useSelector(s => s.auth);
  const cartTotal = useSelector(selectCartTotal);
  const cartCount = useSelector(selectCartCount);

  const [allMenuItems, setAllMenuItems] = useState(DEFAULT_TAKE_ORDER_MENU);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  // Client-side filter — works instantly regardless of backend version
  const menuItems = allMenuItems.filter(item => {
    const catKey = (item.category || '').toLowerCase().replace(/ /g, '_');
    const matchesCat = category === 'all' || catKey === category;
    const matchesSearch = !search.trim() ||
      item.name?.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get('/menu').catch(() => null);
        const data = res?.data?.data || [];
        setAllMenuItems(data.length > 0 ? data : DEFAULT_TAKE_ORDER_MENU);
      } catch {} finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const placeOrder = async () => {
    if (cartItems.length === 0) return Alert.alert('Empty Cart', 'Please add items to your cart first');
    setPlacing(true);
    try {
      const restaurantId =
        allMenuItems[0]?.restaurantId ||
        user?.restaurantId?._id ||
        user?.restaurantId ||
        '60d0fe4f5311236168a109ca';

      const tableIdentifier = table?._id || 'tab1';
      const tableNum = String(table?.tableNumber || '1');

      const res = await api.post('/orders', {
        restaurantId,
        tableId: tableIdentifier,
        tableNumber: tableNum,
        items: cartItems.map(i => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          isVeg: i.isVeg,
          notes: i.notes || '',
        })),
        notes,
        orderType: 'dine_in',
      });

      await api.patch(`/tables/${tableIdentifier}/status`, { status: 'occupied', customerCount: 1 }).catch(() => {});
      dispatch(clearCart());
      Alert.alert('✅ Order Placed!', `Order #${res.data.data?.orderNumber || ''} sent to kitchen`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to place order. Please try again.';
      Alert.alert('Order Failed', msg);
    } finally { setPlacing(false); }
  };

  const getQty = (id) => cartItems.find(i => i.menuItemId === id)?.quantity || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Take Order</Text>
          {table && <Text style={styles.headerSub}>Table {table.tableNumber}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{cartCount} items</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.green }}>₹{cartTotal.toFixed(0)}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search menu..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, alignItems: 'center' }}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} onPress={() => setCategory(c)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: category === c ? colors.green : colors.bgCard, borderWidth: 1, borderColor: category === c ? colors.green : colors.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: category === c ? '#000' : colors.textMuted }}>
                {CAT_LABELS[c] || c}
              </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu List */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.green} /></View>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const qty = getQty(item._id);
            return (
              <View style={styles.menuRow}>
                <View style={styles.menuRowLeft}>
                  <View style={styles.menuEmoji}>
                    <Text style={{ fontSize: 24 }}>{item.isVeg ? '🥗' : '🍗'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.menuPrice}>₹{item.price}</Text>
                  </View>
                </View>
                {qty === 0 ? (
                  <TouchableOpacity style={styles.addBtn} onPress={() => dispatch(addItem({ menuItemId: item._id, name: item.name, price: item.price, isVeg: item.isVeg, quantity: 1 }))}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch({ type: 'cart/updateQuantity', payload: { menuItemId: item._id, quantity: qty - 1 } })}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{qty}</Text>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.green }]} onPress={() => dispatch(addItem({ menuItemId: item._id, name: item.name, price: item.price, isVeg: item.isVeg, quantity: 1 }))}>
                      <Text style={[styles.qtyBtnText, { color: '#000' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Place Order Footer */}
      {cartCount > 0 && (
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{cartCount} items</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.green }}>₹{cartTotal.toFixed(0)}</Text>
          </View>
          <TouchableOpacity style={[styles.placeBtn, placing && { opacity: 0.7 }]} onPress={placeOrder} disabled={placing}>
            {placing ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.placeBtnText}>Send to Kitchen →</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: 12, color: colors.green, textAlign: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 11, color: colors.textPrimary, fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  menuEmoji: { width: 44, height: 44, backgroundColor: colors.bgSecondary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  menuPrice: { fontSize: 13, fontWeight: '700', color: colors.green, marginTop: 2 },
  addBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  qtyBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: colors.textPrimary, lineHeight: 20 },
  qtyVal: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border, gap: 16 },
  placeBtn: { backgroundColor: colors.green, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 14, ...shadows.green },
  placeBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
});
