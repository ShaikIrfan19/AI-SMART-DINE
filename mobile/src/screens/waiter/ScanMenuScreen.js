import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

export default function ScanMenuScreen({ navigation }) {
  const { user } = useSelector(s => s.auth);
  const [scanning, setScanning]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualData, setManualData]     = useState({
    name: '', price: '', category: 'starters', description: '',
  });

  const submitMenuItem = async (item) => {
    setLoading(true);
    try {
      const rid = user?.restaurantId?._id || user?.restaurantId;
      await api.post('/menu', { ...item, restaurantId: rid });
      Alert.alert('✅ Success', 'Menu item added successfully!');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    const { name, price, category, description } = manualData;
    if (!name.trim() || !price.trim()) {
      Alert.alert('Validation', 'Name and price are required');
      return;
    }
    await submitMenuItem({ name, price: parseFloat(price), category, description });
    setManualVisible(false);
    setManualData({ name: '', price: '', category: 'starters', description: '' });
  };

  const startScan = () => {
    Alert.alert(
      '📷 Scan Menu QR',
      'Point your camera at a menu QR code. Make sure the QR encodes item data as JSON.\n\nFor now, use "Add Manually" to add items directly.',
      [
        { text: 'Add Manually', onPress: () => setManualVisible(true) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Menu Item</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>📷</Text>
        </View>

        <Text style={styles.subtitle}>Add menu items by scanning a QR code or entering details manually</Text>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
          <Text style={styles.primaryBtnText}>📷  Start QR Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setManualVisible(true)}>
          <Text style={styles.secondaryBtnText}>✏️  Add Manually</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <Text style={styles.hint}>
          💡 Tip: QR codes should encode JSON like{'\n'}
          {'{"name":"Pasta","price":180,"category":"main_course"}'}
        </Text>
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal
        visible={manualVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Menu Item</Text>

            {[
              { label: 'Item Name *', key: 'name', placeholder: 'e.g. Garlic Bread', kb: 'default' },
              { label: 'Price (₹) *', key: 'price', placeholder: '150', kb: 'numeric' },
              { label: 'Category', key: 'category', placeholder: 'starters, main_course...', kb: 'default' },
              { label: 'Description', key: 'description', placeholder: 'Short description (optional)', kb: 'default' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={manualData[f.key]}
                  onChangeText={v => setManualData(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.kb}
                />
              </View>
            ))}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setManualVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleManualSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.confirmBtnText}>Add Item</Text>
                }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, color: colors.green, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  body: { padding: spacing.xl, alignItems: 'center' },
  iconBox: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  iconText: { fontSize: 48 },
  subtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: spacing.xl,
  },
  primaryBtn: {
    width: '100%', backgroundColor: colors.green,
    borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', marginBottom: spacing.md,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  secondaryBtn: {
    width: '100%', backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  divider: {
    width: '100%', height: 1, backgroundColor: colors.border,
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  hint: {
    fontSize: 12, color: colors.textMuted,
    textAlign: 'center', lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18, fontWeight: '800',
    color: colors.textPrimary, marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11, fontWeight: '700',
    color: colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md, padding: 13,
    color: colors.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', color: colors.textSecondary },
  confirmBtn: {
    flex: 1, padding: 14, borderRadius: radius.md,
    backgroundColor: colors.green, alignItems: 'center',
  },
  confirmBtnText: { fontWeight: '800', color: '#000' },
});
