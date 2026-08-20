import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

const PROMO_BANNERS = [
  {
    id: '1',
    title: '✨ 20% OFF Combo Deals',
    subtitle: 'Delicious family meals at discounted prices',
    bg: 'rgba(16,185,129,0.15)',
    border: '#10b981',
    badge: 'LIMITED OFFER',
  },
  {
    id: '2',
    title: '🍷 Free Welcome Drink',
    subtitle: 'Complimentary mocktail on table reservation',
    bg: 'rgba(245,158,11,0.15)',
    border: '#f59e0b',
    badge: 'SPECIAL',
  },
  {
    id: '3',
    title: '👨‍🍳 Chef Specials Today',
    subtitle: 'Handcrafted signature gourmet dishes',
    bg: 'rgba(139,92,246,0.15)',
    border: '#8b5cf6',
    badge: 'CHEF CHOICE',
  },
];

import socket from '../../services/socket';

export default function CustomerHomeScreen({ navigation }) {
  const { user } = useSelector(state => state.auth);
  const [popularItems, setPopularItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const SHARED_RESTAURANT_ID = '60d0fe4f5311236168a109ca';

  const fetchPopularDishes = useCallback(async () => {
    try {
      let res = await api.get('/menu');
      let items = res.data?.data || [];
      if (!items.length) {
        res = await api.get('/menu?limit=100').catch(() => ({ data: { data: [] } }));
        items = res.data?.data || [];
      }
      // Filter items marked as popular or take top 6 items
      const popular = items.filter(i => i.isPopular || i.isBestSeller).concat(items).slice(0, 6);
      setPopularItems(popular);
    } catch (e) {
      setPopularItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPopularDishes();

    const handleMenuUpdate = () => fetchPopularDishes();
    socket.on('menu_updated', handleMenuUpdate);
    socket.on('menu_item_added', handleMenuUpdate);
    socket.on('menu_item_updated', handleMenuUpdate);
    socket.on('menu_item_deleted', handleMenuUpdate);

    return () => {
      socket.off('menu_updated', handleMenuUpdate);
      socket.off('menu_item_added', handleMenuUpdate);
      socket.off('menu_item_updated', handleMenuUpdate);
      socket.off('menu_item_deleted', handleMenuUpdate);
    };
  }, [fetchPopularDishes]);

  const handleCallWaiter = async () => {
    console.log('🔔 [CustomerHomeScreen] Emitting call_waiter socket event...');
    socket.emit('call_waiter', {
      restaurantId: SHARED_RESTAURANT_ID,
      tableNumber: 'Table 1',
      customerName: user?.name || 'Customer',
      message: `${user?.name || 'Customer'} called for a waiter at Table 1`,
    });
    try {
      await api.post('/notifications/call-waiter', {
        restaurantId: SHARED_RESTAURANT_ID,
        tableNumber: 'Table 1',
        message: `${user?.name || 'Customer'} called for a waiter at Table 1`,
      });
      Alert.alert('🔔 Waiter Notified!', 'A waiter has been alerted and will assist you shortly at Table 1!');
    } catch {
      Alert.alert('🔔 Waiter Called', 'A waiter has been notified!');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Day, {user?.name?.split(' ')[0] || 'Guest'} 👋</Text>
          <Text style={styles.restaurantName}>AI Smart Dine 🍽️</Text>
        </View>
        <TouchableOpacity
          style={styles.callWaiterBtn}
          onPress={handleCallWaiter}
          activeOpacity={0.8}
        >
          <Text style={styles.callWaiterText}>🔔 Call Waiter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPopularDishes(); }}
            tintColor={colors.green}
          />
        }
      >
        {/* Welcome Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⭐ #1 Smart Restaurant</Text>
          </View>
          <Text style={styles.heroTitle}>Delicious Food & Instant Service 🍕</Text>
          <Text style={styles.heroSubtitle}>
            Order directly, reserve your favorite table, or call waiter with one tap.
          </Text>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => navigation.navigate('Menu')}
            activeOpacity={0.9}
          >
            <Text style={styles.heroBtnText}>Browse Full Menu →</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Banners Carousel */}
        <View style={{ marginTop: spacing.lg }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}
          >
            {PROMO_BANNERS.map(promo => (
              <View
                key={promo.id}
                style={[
                  styles.promoCard,
                  { backgroundColor: promo.bg, borderColor: promo.border },
                ]}
              >
                <View style={[styles.promoBadge, { backgroundColor: promo.border }]}>
                  <Text style={styles.promoBadgeText}>{promo.badge}</Text>
                </View>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <Text style={styles.promoSub}>{promo.subtitle}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Action Navigation Grid */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => navigation.navigate('Menu')}
              activeOpacity={0.8}
            >
              <Text style={styles.gridIcon}>🍽️</Text>
              <Text style={styles.gridTitle}>Explore Menu</Text>
              <Text style={styles.gridSub}>View all dishes & prices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => navigation.navigate('Reservations')}
              activeOpacity={0.8}
            >
              <Text style={styles.gridIcon}>🗓️</Text>
              <Text style={styles.gridTitle}>Book Table</Text>
              <Text style={styles.gridSub}>Reserve seat in advance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => navigation.navigate('Orders')}
              activeOpacity={0.8}
            >
              <Text style={styles.gridIcon}>📋</Text>
              <Text style={styles.gridTitle}>Track Orders</Text>
              <Text style={styles.gridSub}>Live status updates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.gridIcon}>👤</Text>
              <Text style={styles.gridTitle}>My Profile</Text>
              <Text style={styles.gridSub}>Account & Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular / Trending Dishes Section */}
        <View style={{ marginTop: spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Chef's Trending Dishes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
              <Text style={{ fontSize: 13, color: colors.green, fontWeight: '700' }}>View All →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.green} style={{ marginVertical: 20 }} />
          ) : popularItems.length === 0 ? (
            <Text style={{ color: colors.textMuted, paddingHorizontal: spacing.lg, fontSize: 13 }}>
              Explore our menu to discover delicious dishes!
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 14 }}
            >
              {popularItems.map(item => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.dishCard}
                  onPress={() => navigation.navigate('Menu')}
                  activeOpacity={0.85}
                >
                  <View style={styles.dishImageBox}>
                    <Text style={{ fontSize: 44 }}>{item.isVeg ? '🥗' : '🍗'}</Text>
                    {item.isVeg ? (
                      <View style={[styles.vegBadge, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                        <Text style={{ color: colors.green, fontSize: 10, fontWeight: '800' }}>🟢 VEG</Text>
                      </View>
                    ) : (
                      <View style={[styles.vegBadge, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                        <Text style={{ color: colors.red, fontSize: 10, fontWeight: '800' }}>🔴 NON-VEG</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.dishCat} numberOfLines={1}>{item.category?.replace(/_/g, ' ')}</Text>
                  
                  <View style={styles.dishBottom}>
                    <Text style={styles.dishPrice}>₹{item.price}</Text>
                    <View style={styles.viewBadge}>
                      <Text style={styles.viewBadgeText}>View</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Why Choose Us Section */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Text style={styles.sectionTitle}>💎 Why Dine With Us?</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🌿</Text>
              <Text style={styles.featureTitle}>100% Fresh</Text>
              <Text style={styles.featureSub}>Organic & premium ingredients</Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureTitle}>Fast Service</Text>
              <Text style={styles.featureSub}>Instant waiter call & tracking</Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🤖</Text>
              <Text style={styles.featureTitle}>AI Smart Dine</Text>
              <Text style={styles.featureSub}>Personalized dining suggestions</Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>👑</Text>
              <Text style={styles.featureTitle}>VIP Ambiance</Text>
              <Text style={styles.featureSub}>Comfortable table seating</Text>
            </View>
          </View>
        </View>

        {/* Rating Footer Badge */}
        <View style={styles.ratingBar}>
          <Text style={{ fontSize: 24 }}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>4.9 Stars Average Customer Rating</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Over 500+ satisfied foodies served!</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  greeting: { fontSize: 13, color: colors.textMuted },
  restaurantName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  callWaiterBtn: {
    backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.borderActive,
  },
  callWaiterText: { fontSize: 12, fontWeight: '700', color: colors.green },

  heroCard: {
    margin: spacing.lg, backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.3)',
    ...shadows.green,
  },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '800', color: colors.green },
  heroTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, lineHeight: 26, marginBottom: 6 },
  heroSubtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 16 },
  heroBtn: {
    backgroundColor: colors.green, borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'flex-start',
  },
  heroBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  promoCard: {
    width: 260, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5,
  },
  promoBadge: {
    alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 8,
  },
  promoBadgeText: { fontSize: 9, fontWeight: '900', color: '#000' },
  promoTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  promoSub: { fontSize: 12, color: colors.textMuted },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },

  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  gridIcon: { fontSize: 28, marginBottom: 6 },
  gridTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  gridSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  dishCard: {
    width: 150, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  dishImageBox: {
    height: 90, backgroundColor: colors.bgSecondary, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative',
  },
  vegBadge: {
    position: 'absolute', top: 6, right: 6, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
  },
  dishName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  dishCat: { fontSize: 11, color: colors.textMuted, textTransform: 'capitalize', marginTop: 2 },
  dishBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  dishPrice: { fontSize: 15, fontWeight: '800', color: colors.green },
  viewBadge: {
    backgroundColor: colors.bgSecondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  viewBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureItem: {
    flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  featureIcon: { fontSize: 22, marginBottom: 6 },
  featureTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  featureSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  ratingBar: {
    margin: spacing.lg, marginTop: spacing.xl, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border,
  },
});
