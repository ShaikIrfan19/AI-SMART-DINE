// WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions, Image } from 'react-native';
import { colors, radius } from '../../theme';

const LOGO = require('../../assets/logo.png');

const { width, height } = Dimensions.get('window');

export function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.topSection}>
        <View style={styles.glow1} /><View style={styles.glow2} />
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🍽️</Text>
        </View>
        <Text style={styles.appName}>AI Smart Dine</Text>
        <Text style={styles.tagline}>The smartest way to manage your restaurant</Text>

        {/* Centered Buttons */}
        <View style={styles.centerButtons}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Get Started →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
            <Text style={styles.btnSecondaryText}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bottomSection}>
        <Text style={styles.terms}>By continuing, you agree to our Terms of Service & Privacy Policy</Text>
      </View>
    </View>
  );
}

// LoginScreen.js
import { useState } from 'react';
import { TextInput, Alert, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { setCredentials } from '../../store/authSlice';

export function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data.data;
      await AsyncStorage.setItem('asd_token', token);
      await AsyncStorage.setItem('asd_user', JSON.stringify(user));
      dispatch(setCredentials({ token, user }));
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const quickLogins = [
    { label: 'Admin', email: 'admin@restaurant.com', pw: 'Admin@123' },
    { label: 'Waiter', email: 'waiter@restaurant.com', pw: 'Waiter@123' },
    { label: 'Customer', email: 'customer@test.com', pw: 'Customer@123' },
  ];

  return (
    <KeyboardAvoidingView style={loginStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={loginStyles.scroll} keyboardShouldPersistTaps="handled">
        <View style={loginStyles.header}>
          <Image source={LOGO} style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 4 }} resizeMode="contain" />
          <Text style={loginStyles.title}>Welcome Back</Text>
          <Text style={loginStyles.subtitle}>Sign in to your restaurant dashboard</Text>
        </View>

        {/* Quick Demo Logins */}
        <View style={loginStyles.demoSection}>
          <Text style={loginStyles.demoLabel}>DEMO LOGIN AS:</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {quickLogins.map(q => (
              <TouchableOpacity key={q.label} style={loginStyles.demoBtn} onPress={() => { setEmail(q.email); setPassword(q.pw); }} activeOpacity={0.8}>
                <Text style={loginStyles.demoBtnText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={loginStyles.form}>
          <View style={loginStyles.inputGroup}>
            <Text style={loginStyles.label}>Email Address</Text>
            <TextInput style={loginStyles.input} placeholder="you@restaurant.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={loginStyles.inputGroup}>
            <Text style={loginStyles.label}>Password</Text>
            <View>
              <TextInput style={loginStyles.input} placeholder="••••••••" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
              <TouchableOpacity style={loginStyles.eyeBtn} onPress={() => setShowPw(!showPw)}>
                <Text style={{ color: colors.textMuted }}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
            <Text style={{ color: colors.green, fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[loginStyles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={loginStyles.submitText}>Sign In →</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Don't have an account? <Text style={{ color: colors.green, fontWeight: '700' }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// RegisterScreen.js placeholder
export function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      Alert.alert('Success', 'Account created! Please check your email for verification.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={loginStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={loginStyles.scroll} keyboardShouldPersistTaps="handled">
        <View style={loginStyles.header}>
          <Image source={LOGO} style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 4 }} resizeMode="contain" />
          <Text style={loginStyles.title}>Create Account</Text>
          <Text style={loginStyles.subtitle}>Join AI Smart Dine today</Text>
        </View>
        <View style={loginStyles.form}>
          {[
            { label: 'Full Name', key: 'name', placeholder: 'Your name' },
            { label: 'Email', key: 'email', placeholder: 'you@example.com', type: 'email-address' },
            { label: 'Phone', key: 'phone', placeholder: '+91 00000 00000', type: 'phone-pad' },
          ].map(f => (
            <View key={f.key} style={loginStyles.inputGroup}>
              <Text style={loginStyles.label}>{f.label}</Text>
              <TextInput style={loginStyles.input} placeholder={f.placeholder} placeholderTextColor={colors.textMuted} value={form[f.key]} onChangeText={v => setForm({ ...form, [f.key]: v })} keyboardType={f.type || 'default'} autoCapitalize={f.key === 'email' ? 'none' : 'words'} />
            </View>
          ))}
          <View style={loginStyles.inputGroup}>
            <Text style={loginStyles.label}>Password</Text>
            <TextInput style={loginStyles.input} placeholder="Min 6 characters" placeholderTextColor={colors.textMuted} secureTextEntry value={form.password} onChangeText={v => setForm({ ...form, password: v })} />
          </View>
          <View style={loginStyles.inputGroup}>
            <Text style={loginStyles.label}>I am a</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['customer', 'waiter', 'restaurant_admin'].map(r => (
                <TouchableOpacity key={r} onPress={() => setForm({ ...form, role: r })}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: 1, borderWidth: 1, borderColor: form.role === r ? colors.green : colors.border, backgroundColor: form.role === r ? colors.greenGlow : 'transparent', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: form.role === r ? colors.green : colors.textMuted, textTransform: 'capitalize' }}>
                    {r.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={[loginStyles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={loginStyles.submitText}>Create Account →</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Already have account? <Text style={{ color: colors.green, fontWeight: '700' }}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); setStep(2); }
    catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  const handleReset = async () => {
    setLoading(true);
    try { await api.post('/auth/reset-password', { email, otp, newPassword }); Alert.alert('Success', 'Password reset!', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]); }
    catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <View style={loginStyles.container}>
      <ScrollView contentContainerStyle={loginStyles.scroll}>
        <View style={loginStyles.header}><Text style={loginStyles.logo}>🔐</Text><Text style={loginStyles.title}>{step === 1 ? 'Forgot Password' : step === 2 ? 'Enter OTP' : 'New Password'}</Text></View>
        <View style={loginStyles.form}>
          {step === 1 && (<><View style={loginStyles.inputGroup}><Text style={loginStyles.label}>Email</Text><TextInput style={loginStyles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" /></View><TouchableOpacity style={loginStyles.submitBtn} onPress={handleSend} disabled={loading}><Text style={loginStyles.submitText}>Send OTP →</Text></TouchableOpacity></>)}
          {step === 2 && (<><View style={loginStyles.inputGroup}><Text style={loginStyles.label}>6-Digit OTP</Text><TextInput style={[loginStyles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 12, fontFamily: 'monospace' }]} value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} /></View><TouchableOpacity style={loginStyles.submitBtn} onPress={() => setStep(3)}><Text style={loginStyles.submitText}>Verify →</Text></TouchableOpacity></>)}
          {step === 3 && (<><View style={loginStyles.inputGroup}><Text style={loginStyles.label}>New Password</Text><TextInput style={loginStyles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min 6 characters" placeholderTextColor={colors.textMuted} /></View><TouchableOpacity style={loginStyles.submitBtn} onPress={handleReset} disabled={loading}><Text style={loginStyles.submitText}>Reset Password →</Text></TouchableOpacity></>)}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, alignItems: 'center' }}><Text style={{ color: colors.green, fontSize: 13 }}>← Back to Login</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function OTPScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      Alert.alert('Verified!', 'Email verified successfully.', [{ text: 'Login', onPress: () => navigation.navigate('Login') }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  return (
    <View style={loginStyles.container}>
      <View style={loginStyles.header}><Text style={loginStyles.logo}>📧</Text><Text style={loginStyles.title}>Verify Email</Text><Text style={loginStyles.subtitle}>{email}</Text></View>
      <View style={loginStyles.form}>
        <TextInput style={[loginStyles.input, { textAlign: 'center', fontSize: 28, letterSpacing: 16, fontFamily: 'monospace' }]} value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} placeholder="000000" placeholderTextColor={colors.textMuted} />
        <TouchableOpacity style={[loginStyles.submitBtn, { marginTop: 20 }]} onPress={verify} disabled={loading}>
          <Text style={loginStyles.submitText}>Verify OTP →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  glow1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.green, opacity: 0.07, top: -50, left: -50 },
  glow2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#3b82f6', opacity: 0.05, bottom: 100, right: -50 },
  topSection: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 80 },
  logoContainer: { width: 88, height: 88, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: colors.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  logoEmoji: { fontSize: 44 },
  appName: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  tagline: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 28 },
  centerButtons: { width: '100%', gap: 12, marginTop: 10 },
  features: { gap: 10, width: '100%' },
  featureRow: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  featureText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  bottomSection: { padding: 24, gap: 12 },
  btnPrimary: { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: colors.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  btnPrimaryText: { fontSize: 16, fontWeight: '800', color: '#000' },
  btnSecondary: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  terms: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});

const loginStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  demoSection: { backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', marginBottom: 20 },
  demoLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  demoBtn: { flex: 1, padding: 8, backgroundColor: colors.bgSecondary, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  demoBtnText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
  form: {},
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  submitBtn: { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#000' },
});

export default WelcomeScreen;
