import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart, updateQuantity, setOrderNotes, selectCartTotal } from '../../store/cartSlice';
import api from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: '💵', desc: 'Pay at the counter' },
  { key: 'upi', label: 'UPI / QR', icon: '📱', desc: 'GPay, PhonePe, Paytm' },
];

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, restaurantId, tableId, tableNumber, notes } = useSelector(s => s.cart);
  const { user } = useSelector(s => s.auth);
  const subtotal = useSelector(selectCartTotal);
  const [selectedTable, setSelectedTable] = useState(tableNumber || '1');
  const [payMethod, setPayMethod] = useState('cash');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const SHARED_RESTAURANT_ID = '60d0fe4f5311236168a109ca';
  const GST_PERCENT = 18;
  const gstAmount = (subtotal * GST_PERCENT) / 100;
  const total = Math.max(0, subtotal + gstAmount - couponDiscount);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const res = await api.post('/billing/apply-coupon', { code: coupon, orderAmount: subtotal });
      setCouponDiscount(res.data.data.discount);
      setCouponMsg(res.data.data.message);
    } catch (err) {
      setCouponMsg(err.response?.data?.message || 'Invalid coupon');
      setCouponDiscount(0);
    }
  };

  const placeOrder = async () => {
    if (items.length === 0) return Alert.alert('Empty Cart', 'Please add items to your cart first.');
    setLoading(true);
    try {
      const rid = restaurantId || user?.restaurantId?._id || user?.restaurantId || SHARED_RESTAURANT_ID;
      const tid = tableId || 'tab1';
      const tnum = String(selectedTable || tableNumber || '1');

      const orderPayload = {
        restaurantId: rid,
        tableId: tid,
        tableNumber: tnum,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          isVeg: i.isVeg,
          notes: i.notes || '',
          addons: i.addons || [],
        })),
        notes,
        orderType: 'dine_in',
        paymentMethod: payMethod,
      };
      const orderRes = await api.post('/orders', orderPayload);
      const order = orderRes.data.data;

      Alert.alert(
        'Order Placed! ✅',
        `Your order #${order.orderNumber || ''} has been placed for Table ${tnum}.\n\nTotal: ₹${total.toFixed(0)} (${payMethod.toUpperCase()})`,
        [{ text: 'View Order →', onPress: () => { dispatch(clearCart()); navigation.navigate('Orders'); } }]
      );
    } catch (err) {
      Alert.alert('Order Failed', err.response?.data?.message || err.message || 'Failed to place order');
    } finally { setLoading(false); }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🛒</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>Your cart is empty</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24 }}>Add items from the menu to get started</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity onPress={() => { dispatch(clearCart()); Alert.alert('Cart Cleared'); }}>
          <Text style={{ fontSize: 12, color: colors.red, fontWeight: '700' }}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Table Selection Bar */}
        <View style={styles.tableInfoBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tableInfoText}>🪑 Dine-in Table: Table {selectedTable}</Text>
            <Text style={styles.tableInfoSub}>Select your table number below</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['1', '2', '3', '4', '5'].map(num => (
              <TouchableOpacity
                key={num}
                onPress={() => setSelectedTable(num)}
                style={[{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, selectedTable === num && { backgroundColor: colors.green, borderColor: colors.green }]}
              >
                <Text style={[{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }, selectedTable === num && { color: '#000' }]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cart Items */}
        <View style={{ padding: spacing.lg }}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {items.map(item => (
            <View key={item.menuItemId} style={styles.cartItem}>
              <View style={styles.cartItemEmoji}>
                <Text style={{ fontSize: 24 }}>{item.isVeg ? '🥗' : '🍗'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>₹{item.price} × {item.quantity}</Text>
              </View>
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch(updateQuantity({ menuItemId: item.menuItemId, quantity: item.quantity - 1 }))}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.green }]} onPress={() => dispatch(updateQuantity({ menuItemId: item.menuItemId, quantity: item.quantity + 1 }))}>
                  <Text style={[styles.qtyBtnText, { color: '#000' }]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cartItemTotal}>₹{item.totalPrice}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special requests? (optional)"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={v => dispatch(setOrderNotes(v))}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Coupon */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={styles.sectionTitle}>Have a Coupon?</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[styles.couponInput]}
              placeholder="Enter coupon code (e.g. WELCOME50)"
              placeholderTextColor={colors.textMuted}
              value={coupon}
              onChangeText={v => { setCoupon(v.toUpperCase()); setCouponMsg(''); }}
            />
            <TouchableOpacity style={styles.couponBtn} onPress={applyCoupon}>
              <Text style={styles.couponBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {couponMsg.length > 0 && (
            <Text style={{ fontSize: 12, color: couponDiscount > 0 ? colors.green : colors.red, marginTop: 6 }}>
              {couponDiscount > 0 ? '🎉 ' : '❌ '}{couponMsg}
            </Text>
          )}
        </View>

        {/* Bill Summary */}
        <View style={styles.billCard}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          {[
            { label: 'Subtotal', val: subtotal.toFixed(2) },
            { label: `GST (${GST_PERCENT}%)`, val: gstAmount.toFixed(2) },
          ].map(r => (
            <View key={r.label} style={styles.billRow}>
              <Text style={styles.billLabel}>{r.label}</Text>
              <Text style={styles.billVal}>₹{r.val}</Text>
            </View>
          ))}
          {couponDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.green }]}>🎟 Discount</Text>
              <Text style={[styles.billVal, { color: colors.green }]}>−₹{couponDiscount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.billRow, { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textPrimary }}>Total</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.green }}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.payMethodCard, payMethod === m.key && styles.payMethodActive]}
              onPress={() => setPayMethod(m.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.payMethodIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.payMethodLabel}>{m.label}</Text>
                <Text style={styles.payMethodDesc}>{m.desc}</Text>
              </View>
              <View style={[styles.radioBtn, payMethod === m.key && styles.radioBtnActive]}>
                {payMethod === m.key && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.placeOrderContainer}>
        <TouchableOpacity style={[styles.placeOrderBtn, loading && { opacity: 0.7 }]} onPress={placeOrder} disabled={loading} activeOpacity={0.9}>
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.placeOrderText}>Place Order • ₹{total.toFixed(0)}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  tableInfoBar: { backgroundColor: 'rgba(16,185,129,0.08)', margin: spacing.lg, marginBottom: 0, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  tableInfoText: { fontSize: 14, fontWeight: '700', color: colors.green },
  tableInfoSub: { fontSize: 12, color: colors.textMuted },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  cartItemEmoji: { width: 44, height: 44, backgroundColor: colors.bgSecondary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cartItemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  cartItemPrice: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cartItemTotal: { fontSize: 15, fontWeight: '700', color: colors.green, minWidth: 56, textAlign: 'right' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  qtyBtnText: { fontSize: 16, color: colors.textPrimary, lineHeight: 20 },
  qtyValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, minWidth: 18, textAlign: 'center' },
  notesInput: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top', minHeight: 72 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  couponBtn: { backgroundColor: colors.green, borderRadius: radius.md, paddingHorizontal: 18, justifyContent: 'center' },
  couponBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  billCard: { margin: spacing.lg, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 13, color: colors.textMuted },
  billVal: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  payMethodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  payMethodActive: { borderColor: colors.borderActive, backgroundColor: colors.greenGlow },
  payMethodIcon: { fontSize: 24 },
  payMethodLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  payMethodDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  radioBtn: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioBtnActive: { borderColor: colors.green },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  placeOrderContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  placeOrderBtn: { backgroundColor: colors.green, borderRadius: radius.lg, padding: 18, alignItems: 'center', ...shadows.green },
  placeOrderText: { fontSize: 17, fontWeight: '800', color: '#000' },
  backBtn: { backgroundColor: colors.green, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
