// SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSplashDone, setCredentials } from '../../store/authSlice';
import { colors } from '../../theme';

export default function SplashScreen() {
  const dispatch = useDispatch();
  const scale   = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dot1    = useRef(new Animated.Value(0.3)).current;
  const dot2    = useRef(new Animated.Value(0.3)).current;
  const dot3    = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 55, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    // Pulsing dots
    const pulse = (dot, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    ).start();
    pulse(dot1, 0);
    pulse(dot2, 200);
    pulse(dot3, 400);

    // Load stored session
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('asd_token');
        const user  = await AsyncStorage.getItem('asd_user');
        if (token && user) dispatch(setCredentials({ token, user: JSON.parse(user) }));
      } catch {}
      setTimeout(() => dispatch(setSplashDone()), 900);
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Ambient glow */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center' }}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Brand name */}
        <Text style={styles.title}>AI Smart Dine</Text>
        <Text style={styles.tagline}>Restaurant Management Ecosystem</Text>

        {/* Animated dots */}
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
          ))}
        </View>
      </Animated.View>

      <Text style={styles.version}>v1.0.0 • Powered by Gemini AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  glow1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: colors.green, opacity: 0.05, top: '10%', left: '-10%' },
  glow2: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: colors.green, opacity: 0.04, bottom: '10%', right: '-8%' },
  logoWrap: {
    width: 120, height: 120, borderRadius: 32,
    backgroundColor: '#0a0a0a',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  logo: { width: 100, height: 100, borderRadius: 24 },
  title: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  tagline: { fontSize: 13, color: colors.textMuted, letterSpacing: 0.3 },
  dotsRow: { flexDirection: 'row', gap: 10, marginTop: 44 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  version: { position: 'absolute', bottom: 40, fontSize: 11, color: colors.textMuted },
});
