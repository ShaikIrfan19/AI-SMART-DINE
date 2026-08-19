import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setTableInfo } from '../../store/cartSlice';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🍽️' },
  { key: 'starters', label: 'Starters', emoji: '🥗' },
  { key: 'main_course', label: 'Main', emoji: '🍛' },
  { key: 'desserts', label: 'Desserts', emoji: '🍮' },
  { key: 'drinks', label: 'Drinks', emoji: '🥤' },
  { key: 'combos', label: 'Combos', emoji: '🎁' },
];

function AIInsightBanner({ restaurantId }) {
  const [insight, setInsight] = useState(null);
  useEffect(() => {
    if (!restaurantId) return;
    api.post('/ai/recommendations', { restaurantId, orderedItems: [] })
      .then(res => setInsight(res.data.data?.greeting || res.data.data?.insight))
      .catch(() => {});
  }, [restaurantId]);
  if (!insight) return null;
  return (
    <View style={styles.aiBanner}>
      <Text style={styles.aiBannerIcon}>🤖</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.aiBannerTitle}>AI Recommendation</Text>
        <Text style={styles.aiBannerText} numberOfLines={2}>{insight}</Text>
      </View>
    </View>
  );
}

function MenuItemCard({ item, onAddToCart }) {
  const [qty, setQty] = useState(0);
  return (
    <View style={styles.menuCard}>
      <View style={styles.menuImageBox}>
        <Text style={styles.menuEmoji}>{item.isVeg ? '🥗' : '🍗'}</Text>
        {item.isPopular && <View style={styles.hotBadge}><Text style={styles.hotBadgeText}>🔥 HOT</Text></View>}
        {item.isBestSeller && <View style={[styles.hotBadge, { backgroundColor: colors.green }]}><Text style={[styles.hotBadgeText, { color: '#000' }]}>⭐ BEST</Text></View>}
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.menuDesc} numberOfLines={2}>{item.description || item.category}</Text>
        <View style={styles.menuMeta}>
          {item.preparationTime > 0 && <Text style={styles.metaText}>⏱ {item.preparationTime}min</Text>}
          {item.spicyLevel !== 'none' && <Text style={styles.metaText}>{item.spicyLevel === 'hot' ? '🌶🌶🌶' : item.spicyLevel === 'medium' ? '🌶🌶' : '🌶'}</Text>}
          <Text style={styles.metaText}>{item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}</Text>
        </View>
        <View style={styles.menuBottom}>
          <Text style={styles.menuPrice}>₹{item.price}</Text>
          {qty === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setQty(1); onAddToCart(item, 1); }}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => { const n = qty - 1; setQty(n); onAddToCart(item, n); }}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.green }]} onPress={() => { const n = qty + 1; setQty(n); onAddToCart(item, 1); }}>
                <Text style={[styles.qtyBtnText, { color: '#000' }]}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function CustomerHomeScreen({ navigation }) {
  const { user } = useSelector(state => state.auth);
  const { items: cartItems, restaurantId: cartRestaurantId } = useSelector(state => state.cart);
  const dispatch = useDispatch();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [restaurant, setRestaurant] = useState(null);

  const restaurantId = user?.restaurantId?._id || user?.restaurantId || user?.id;
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.totalPrice, 0);

  const fetchMenu = useCallback(async () => {
    try {
      const params = new URLSearchParams({});
      if (restaurantId && restaurantId !== 'undefined') params.set('restaurantId', restaurantId);
      params.set('isAvailable', 'true');
      if (category && category !== 'all') params.set('category', category);
      if (search && search.trim() !== '') params.set('search', search.trim());
      const menuRes = await api.get(`/menu?${params}`);
      setMenuItems(menuRes.data.data || []);
      if (restaurantId && restaurantId !== 'undefined') {
        try {
          const restRes = await api.get(`/restaurants/${restaurantId}`);
          setRestaurant(restRes.data.data);
        } catch {}
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, category, search]);

  useEffect(() => {
    fetchMenu();
    // Auto-refresh menu every 30s to stay in sync with admin updates
    const timer = setInterval(fetchMenu, 30000);
    return () => clearInterval(timer);
  }, [fetchMenu]);

  const handleAddToCart = (item, quantity) => {
    if (!cartRestaurantId) {
      dispatch(setTableInfo({ restaurantId, tableId: null, tableNumber: null }));
    }
    dispatch({ type: quantity > 0 ? 'cart/addItem' : 'cart/removeItem', payload: quantity > 0 ? { ...item, menuItemId: item._id, quantity: 1 } : item._id });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.restaurantName}>{restaurant?.name || 'Loading...'}</Text>
        </View>
        <TouchableOpacity style={styles.callWaiterBtn} onPress={() => Alert.alert('Waiter Called', 'A waiter will be with you shortly!')}>
          <Text style={styles.callWaiterText}>🔔 Call Waiter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMenu(); }} tintColor={colors.green} />}
      >
        {/* Restaurant Open/Close badge */}
        {restaurant && (
          <View style={styles.restInfoBar}>
            <View style={[styles.openBadge, { backgroundColor: restaurant.isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(85,85,85,0.15)' }]}>
              <View style={[styles.openDot, { backgroundColor: restaurant.isOpen ? colors.green : colors.textMuted }]} />
              <Text style={[styles.openText, { color: restaurant.isOpen ? colors.green : colors.textMuted }]}>
                {restaurant.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
            <Text style={styles.restHours}>{restaurant.openingTime} – {restaurant.closingTime}</Text>
          </View>
        )}

        {/* AI Banner */}
        <AIInsightBanner restaurantId={restaurantId} />

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: colors.textMuted, fontSize: 18, paddingHorizontal: 8 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: cartCount > 0 ? 100 : 20 }}>
          <Text style={styles.sectionTitle}>
            {category === 'all' ? '🍽️ Full Menu' : CATEGORIES.find(c => c.key === category)?.label} ({menuItems.length})
          </Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={styles.loadingText}>Loading menu...</Text>
            </View>
          ) : menuItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptyText}>Try a different category or search term</Text>
            </View>
          ) : (
            menuItems.map(item => (
              <MenuItemCard key={item._id} item={item} onAddToCart={handleAddToCart} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Cart Floating Bar */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate('Cart')} activeOpacity={0.9}>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.cartBarText}>View Cart</Text>
          <Text style={styles.cartBarPrice}>₹{cartTotal.toFixed(0)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  greeting: { fontSize: 13, color: colors.textMuted },
  restaurantName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  callWaiterBtn: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.borderActive },
  callWaiterText: { fontSize: 12, fontWeight: '700', color: colors.green },
  restInfoBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  openDot: { width: 7, height: 7, borderRadius: 99 },
  openText: { fontSize: 12, fontWeight: '700' },
  restHours: { fontSize: 12, color: colors.textMuted },
  aiBanner: { margin: spacing.lg, marginBottom: 0, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  aiBannerIcon: { fontSize: 24 },
  aiBannerTitle: { fontSize: 11, fontWeight: '700', color: colors.green, textTransform: 'uppercase', letterSpacing: 0.5 },
  aiBannerText: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.textPrimary, fontSize: 14 },
  categoriesRow: { marginBottom: spacing.md },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: colors.bgCard, borderRadius: 99, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  categoryLabelActive: { color: '#000' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  menuCard: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuImageBox: { width: 100, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  menuEmoji: { fontSize: 36 },
  hotBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  hotBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  menuInfo: { flex: 1, padding: 12 },
  menuName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  menuDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 6 },
  menuMeta: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  metaText: { fontSize: 11, color: colors.textMuted },
  menuBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuPrice: { fontSize: 17, fontWeight: '800', color: colors.green },
  addBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  qtyBtnText: { fontSize: 18, color: colors.textPrimary, lineHeight: 22 },
  qtyValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  loadingBox: { alignItems: 'center', padding: 48 },
  loadingText: { color: colors.textMuted, marginTop: 12 },
  emptyBox: { alignItems: 'center', padding: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  cartBar: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.green, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', padding: 16, ...shadows.green },
  cartBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cartBadgeText: { fontSize: 12, fontWeight: '800', color: colors.green },
  cartBarText: { flex: 1, fontSize: 15, fontWeight: '800', color: '#000' },
  cartBarPrice: { fontSize: 16, fontWeight: '800', color: '#000' },
});
