import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { WaiterTablesScreen as BaseTablesScreen } from './WaiterDashboard';

export default function WaiterTablesScreenWrapper() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <BaseTablesScreen navigation={navigation} />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ScanMenu')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.green,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '300',
  },
});
