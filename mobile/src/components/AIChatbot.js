import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Dimensions, Animated,
} from 'react-native';
import api from '../services/api';
import { colors, radius, shadows } from '../theme';

const { width, height } = Dimensions.get('window');

export default function AIChatbot() {
  const [isOpen, setIsOpen]     = useState(false);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'ai',
      text: 'Hello! I am Smart Dine AI 🤖. How can I help you today with food recommendations, prices, or menu items?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [isOpen, messages]);

  const generateSmartReply = (userText, history = []) => {
    const text = userText.toLowerCase().trim();

    // 1. Food Recommendations
    if (text.includes('recommend') || text.includes('suggest') || text.includes('food') || text.includes('special') || text.includes('dish')) {
      return "🌟 Top Recommendations at AI Smart Dine:\n\n• 🍗 Hyderabadi Chicken Biryani — ₹320\n• 🧀 Paneer Tikka Masala — ₹260\n• 🫓 Garlic Butter Naan — ₹60\n• 🥭 Mango Lassi — ₹90\n\nWould you prefer vegetarian, spicy curries, or continental dishes?";
    }

    // 2. Budget under ₹300 / Price questions
    if (text.includes('300') || text.includes('200') || text.includes('500') || text.includes('cheap') || text.includes('budget') || text.includes('price') || text.includes('cost')) {
      return "💰 Great Budget Dishes Under ₹300:\n\n• Veg Fried Rice — ₹180\n• Paneer Butter Masala — ₹260\n• Butter Chicken Roll — ₹220\n• Crispy Corn — ₹160\n• Fresh Lime Soda — ₹70\n\nAll prices include taxes!";
    }

    // 3. Biryani / Follow-up context
    if (text.includes('biryani')) {
      return "🍛 Our Special Dum Biryani (₹280 - ₹340) is slow-cooked in a sealed clay handi with aged basmati rice, tender pieces, and saffron. Served with fresh mirchi ka salan and onion raita!";
    }

    // 4. Spice level follow-ups ("Is it spicy?")
    if (text.includes('spicy') || text.includes('hot') || text.includes('mild')) {
      return "🌶️ We can customize the spice level for any dish! You can choose:\n• Mild (Kid friendly)\n• Medium (Authentic Indian flavor)\n• Extra Spicy 🌶️🌶️🌶️\n\nJust tell your waiter or add a note in your order!";
    }

    // 5. Vegetarian / Non-Veg
    if (text.includes('veg') || text.includes('paneer') || text.includes('mushroom') || text.includes('dal')) {
      return "🌱 Popular Vegetarian Delicacies:\n\n• Paneer Lababdar — ₹270\n• Dal Makhani — ₹220\n• Kadhai Mushroom — ₹250\n• Veg Pulao — ₹190\n• Tandoori Roti — ₹35";
    }

    if (text.includes('non veg') || text.includes('chicken') || text.includes('mutton') || text.includes('fish') || text.includes('prawn')) {
      return "🍗 Chef's Non-Veg Specials:\n\n• Murgh Malai Tikka — ₹290\n• Mutton Rogan Josh — ₹380\n• Butter Chicken — ₹310\n• Tandoori Fish Tikka — ₹340";
    }

    // 6. Table Reservations / Timings
    if (text.includes('table') || text.includes('reserve') || text.includes('book') || text.includes('timing') || text.includes('open') || text.includes('close')) {
      return "🪑 We are open daily from 11:00 AM to 11:30 PM!\nYou can book Indoor AC tables, Outdoor Garden seating, or Family Cabins directly from the Reservations tab in the app.";
    }

    // 7. Greeting
    if (text.includes('hi') || text.includes('hello') || text.includes('hey') || text.includes('good morning') || text.includes('good evening')) {
      return "Hello there! 👋 I am Smart Dine AI, your personal restaurant assistant.\n\nHow can I help you today? You can ask about our menu, chef recommendations, dish prices in ₹, or table bookings!";
    }

    // 8. Order / Bill / Payment
    if (text.includes('order') || text.includes('bill') || text.includes('pay') || text.includes('payment') || text.includes('upi')) {
      return "💳 You can place orders directly from the menu and pay with UPI (Google Pay, PhonePe, Paytm), Cards, or Cash at the counter with instant e-billing!";
    }

    // 9. Default friendly AI response
    return `That sounds appetizing! 🍽️ Our chefs prepare all dishes fresh to order. Would you like recommendations for appetizers, main courses, desserts, or beverages?`;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));

      // Try server API endpoint first
      const res = await api.post('/ai/chat', {
        message: userMessageText,
        conversationHistory: conversationHistory.slice(-10),
      }).catch(() => null);

      const replyText =
        res?.data?.message ||
        res?.data?.data?.response ||
        generateSmartReply(userMessageText, conversationHistory);

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const fallbackText = generateSmartReply(userMessageText);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: fallbackText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Floating Chat Button (Bottom Right) ── */}
      {!isOpen && (
        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingIcon}>🤖</Text>
        </TouchableOpacity>
      )}

      {/* ── Modern Chat Window Modal ── */}
      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatWindow}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.botAvatarBox}>
                  <Text style={{ fontSize: 22 }}>🤖</Text>
                </View>
                <View>
                  <Text style={styles.chatTitle}>AI Smart Dine</Text>
                  <Text style={styles.chatSubtitle}>Your AI Restaurant Assistant</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsOpen(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Chat History */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.historyBox}
              contentContainerStyle={{ padding: 16, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {messages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.msgRow,
                    msg.role === 'user' ? styles.userRow : styles.aiRow,
                  ]}
                >
                  {msg.role === 'ai' && (
                    <View style={styles.aiMsgAvatar}>
                      <Text style={{ fontSize: 13 }}>🤖</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <Text style={[styles.bubbleText, msg.role === 'user' && styles.userBubbleText]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.msgTime, msg.role === 'user' && styles.userMsgTime]}>
                      {msg.time}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Typing Animation / Loading */}
              {loading && (
                <View style={[styles.msgRow, styles.aiRow]}>
                  <View style={styles.aiMsgAvatar}>
                    <Text style={{ fontSize: 13 }}>🤖</Text>
                  </View>
                  <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color={colors.green} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Smart Dine AI is typing...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask about food, menu, prices (₹)..."
                placeholderTextColor="#555"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}
              >
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Floating Button
  floatingBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.green,
    alignItems: 'center',
    justify: 'center',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  floatingIcon: { fontSize: 30 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  chatWindow: {
    height: height * 0.72,
    backgroundColor: '#0c0c0c',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  // Header
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  botAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle:    { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  chatSubtitle: { fontSize: 11, color: colors.green, fontWeight: '600', marginTop: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  closeText:    { fontSize: 16, color: '#f0f0f0', fontWeight: '800' },

  // History
  historyBox: { flex: 1, backgroundColor: '#050505' },
  msgRow:     { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  userRow:    { justifyContent: 'flex-end' },
  aiRow:      { justifyContent: 'flex-start' },
  aiMsgAvatar:{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },

  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiBubble: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.green,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#f0f0f0', lineHeight: 20 },
  userBubbleText: { color: '#000', fontWeight: '600' },
  msgTime: { fontSize: 9, color: '#666', marginTop: 4, alignSelf: 'flex-end' },
  userMsgTime: { color: 'rgba(0,0,0,0.5)' },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: '#f0f0f0',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justify: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText:     { fontSize: 16, color: '#000', fontWeight: '900' },
});
