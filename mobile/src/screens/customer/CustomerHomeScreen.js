import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

const CATEGORIES = [
  { key: 'all',        label: 'All',        emoji: '🍽️' },
  { key: 'starters',  label: 'Starters',   emoji: '🥗' },
  { key: 'main_course', label: 'Main Course', emoji: '🍛' },
  { key: 'desserts',  label: 'Desserts',   emoji: '🍮' },
  { key: 'drinks',    label: 'Drinks',     emoji: '🥤' },
  { key: 'combos',    label: 'Combos',     emoji: '🎁' },
  { key: 'snacks',    label: 'Snacks',     emoji: '🍟' },
];

function AIInsightBanner() {
  return null; // Simplified — AI endpoint often fails for customer
}

// View-only menu card (no Add to Cart for customer — read only)
function MenuItemCard({ item }) {
  const CAT_LABELS = {
    all: 'All', starters: 'Starters', main_course: 'Main Course',
    desserts: 'Desserts', drinks: 'Drinks', combos: 'Combos', snacks: 'Snacks',
  };
  const catLabel = (cat) => {
    if (!cat) return '';
    const key = cat.toLowerCase().replace(/ /g, '_');
    return CAT_LABELS[key] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <View style={styles.menuCard}>
      <View style={styles.menuImageBox}>
        <Text style={styles.menuEmoji}>{item.isVeg ? '🥗' : '🍗'}</Text>
        {item.isPopular && <View style={styles.hotBadge}><Text style={styles.hotBadgeText}>🔥 HOT</Text></View>}
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.menuCat}>{catLabel(item.category)}</Text>
        {item.description ? (
          <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.menuBottom}>
          <Text style={styles.menuPrice}>₹{item.price}</Text>
          <View style={[styles.vegBadge, { backgroundColor: item.isVeg ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
            <View style={[styles.vegDot, { backgroundColor: item.isVeg ? '#10b981' : '#ef4444' }]} />
            <Text style={[styles.vegText, { color: item.isVeg ? '#10b981' : '#ef4444' }]}>
              {item.isVeg ? 'Veg' : 'Non-Veg'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CustomerHomeScreen({ navigation }) {
  const { user } = useSelector(state => state.auth);

  const [allMenuItems, setAllMenuItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory]   = useState('all');
  const [search, setSearch]       = useState('');

  // Client-side filter — instant, works regardless of backend version
  const menuItems = allMenuItems.filter(item => {
    const catKey = (item.category || '').toLowerCase().replace(/ /g, '_');
    const matchesCat = category === 'all' || catKey === category;
    const matchesSearch = !search.trim() ||
      item.name?.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Fetch ALL items — no restaurantId filter, no isAvailable filter
  const fetchMenu = useCallback(async () => {
    try {
      const res = await api.get('/menu');
      setAllMenuItems(res.data.data || []);
    } catch (e) {
      // silent fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    // Auto-refresh every 30s to stay in sync with admin changes
    const timer = setInterval(fetchMenu, 30000);
    return () => clearInterval(timer);
  }, [fetchMenu]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.restaurantName}>Our Menu</Text>
        </View>
        <TouchableOpacity
          style={styles.callWaiterBtn}
          onPress={() => Alert.alert('🔔 Waiter Called', 'A waiter will be with you shortly!')}
        >
          <Text style={styles.callWaiterText}>🔔 Call Waiter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMenu(); }} tintColor={colors.green} />}
      >
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesRow}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 24 }}>
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
              <Text style={styles.emptyTitle}>
                {allMenuItems.length === 0 ? 'Menu is being updated' : 'No items in this category'}
              </Text>
              <Text style={styles.emptyText}>
                {allMenuItems.length === 0 ? 'Please check back shortly' : 'Try selecting a different category'}
              </Text>
            </View>
          ) : (
            menuItems.map(item => (
              <MenuItemCard key={item._id} item={item} />
            ))
          )}
        </View>
      </ScrollView>
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
  menuName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  menuCat: { fontSize: 11, color: colors.green, fontWeight: '600', marginBottom: 4 },
  menuDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 6 },
  menuBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  menuPrice: { fontSize: 17, fontWeight: '800', color: colors.green },
  vegBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  vegDot: { width: 7, height: 7, borderRadius: 99 },
  vegText: { fontSize: 11, fontWeight: '700' },
  loadingBox: { alignItems: 'center', padding: 48 },
  loadingText: { color: colors.textMuted, marginTop: 12 },
  emptyBox: { alignItems: 'center', padding: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
