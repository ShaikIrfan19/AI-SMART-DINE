const Groq = require('groq-sdk');
const MenuItem = require('../models/MenuItem.model');
const Order = require('../models/Order.model');
const Table = require('../models/Table.model');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama3-8b-8192';

// @POST /api/ai/recommendations
const getFoodRecommendations = async (req, res) => {
  try {
    const { restaurantId, orderedItems, tableType, timeOfDay } = req.body;

    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true })
      .select('name category price isVeg spicyLevel rating totalOrders isPopular')
      .sort({ totalOrders: -1 })
      .limit(30);

    const prompt = `You are a smart restaurant AI assistant for "AI Smart Dine". 
    
    Current menu items: ${JSON.stringify(menuItems.map(m => ({ name: m.name, category: m.category, price: m.price, isVeg: m.isVeg, rating: m.rating, orders: m.totalOrders })))}
    
    Customer already ordered: ${JSON.stringify(orderedItems || [])}
    Table type: ${tableType || 'regular'}
    Time of day: ${timeOfDay || new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
    
    Provide:
    1. Top 3 food recommendations with reasons
    2. One combo suggestion that saves money
    3. A friendly insight about popular items today
    
    Respond STRICTLY with ONLY a JSON object in this format (no markdown, no extra text):
    {
      "recommendations": [{ "name": "...", "reason": "...", "category": "..." }],
      "combo": { "items": ["...", "..."], "savings": "₹XX", "message": "..." },
      "insight": "...",
      "greeting": "..."
    }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable', error: error.message });
  }
};

// @POST /api/ai/chat
const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const systemPrompt = `You are "Smart Dine AI", a friendly and helpful restaurant assistant for AI Smart Dine application.
You answer questions about delicious food, menu items, restaurant specials, dish recommendations, prices, table reservations, orders, billing, and general restaurant questions.
Always quote prices in ₹ (Indian Rupees).
Keep answers crisp, conversational, appetizing, and under 80 words.
Maintain the context of the user's previous questions.`;

    let replyText = '';

    // 1. Try Groq (ultra-fast, free tier)
    if (process.env.GROQ_API_KEY) {
      try {
        const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const messages = [{ role: 'system', content: systemPrompt }];

        if (Array.isArray(conversationHistory)) {
          conversationHistory.slice(-6).forEach(h => {
            if (h.role && h.content) {
              messages.push({
                role: h.role === 'model' || h.role === 'ai' || h.role === 'assistant' ? 'assistant' : 'user',
                content: h.content,
              });
            }
          });
        }
        messages.push({ role: 'user', content: message });

        const modelsToTry = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-8b-8192'];
        for (const m of modelsToTry) {
          try {
            const completion = await groqClient.chat.completions.create({
              messages,
              model: m,
              temperature: 0.7,
              max_tokens: 200,
            });
            replyText = completion.choices[0]?.message?.content;
            if (replyText) break;
          } catch (e) {
            console.log(`Groq model ${m} failed:`, e.message);
          }
        }
      } catch (err) {
        console.error('Groq API failed:', err.message);
      }
    }

    // 2. Try OpenAI API if Groq did not provide a reply
    if (!replyText && process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const messages = [{ role: 'system', content: systemPrompt }];
        if (Array.isArray(conversationHistory)) {
          conversationHistory.slice(-6).forEach(h => {
            if (h.role && h.content) {
              messages.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: h.content });
            }
          });
        }
        messages.push({ role: 'user', content: message });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 200,
          temperature: 0.7,
        });

        replyText = completion.choices[0]?.message?.content;
      } catch (err) {
        console.error('OpenAI API failed:', err.message);
      }
    }

    // 3. Fallback Smart Rule Engine so the chatbot NEVER fails even if APIs are exhausted
    if (!replyText) {
      const lower = message.toLowerCase();
      if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('food') || lower.includes('eat')) {
        replyText = "I'd love to help! For starters, our Paneer Tikka (₹240) and Chicken Dum Biryani (₹320) are customer favorites. Would you prefer vegetarian, non-veg, or something spicy?";
      } else if (lower.includes('300') || lower.includes('cheap') || lower.includes('budget') || lower.includes('price')) {
        replyText = "Great budget picks under ₹300:\n• Paneer Butter Masala (₹260)\n• Veg Fried Rice (₹180)\n• Butter Chicken Roll (₹220)\n• Mango Lassi (₹90)";
      } else if (lower.includes('biryani')) {
        replyText = "Our Dum Biryani (₹280 - ₹340) is slow-cooked with aromatic basmati rice, saffron, and rich spices. You can order it mild, medium, or spicy!";
      } else if (lower.includes('spicy')) {
        replyText = "Yes! You can customize the spice level from Mild 🌶️ to Extra Hot 🌶️🌶️🌶️ when placing your order.";
      } else if (lower.includes('table') || lower.includes('reserve') || lower.includes('book')) {
        replyText = "You can easily reserve a table from the Reservations tab! We have Indoor AC, Outdoor Garden, and Private Dining tables available.";
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        replyText = "Hello! 👋 I'm Smart Dine AI, your personal restaurant assistant. What would you like to explore today — our menu, food recommendations, or table bookings?";
      } else {
        replyText = `That sounds delicious! At AI Smart Dine, our chefs prepare everything fresh. Would you like suggestions on our appetizers, main courses, or desserts?`;
      }
    }

    res.json({
      success: true,
      message: replyText,
    });
  } catch (error) {
    res.json({
      success: true,
      message: "I'm Smart Dine AI! I can help you with food recommendations, prices (₹), and reservations. What are you in the mood for?",
    });
  }
};

// @GET /api/ai/insights/:restaurantId
const getRestaurantInsights = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, topItems, hourlyData] = await Promise.all([
      Order.find({ restaurantId, createdAt: { $gte: today }, paymentStatus: 'paid' }),
      Order.aggregate([
        { $match: { restaurantId: require('mongoose').Types.ObjectId.createFromHexString(restaurantId), createdAt: { $gte: today } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { restaurantId: require('mongoose').Types.ObjectId.createFromHexString(restaurantId), createdAt: { $gte: today } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { '_id': 1 } },
      ]),
    ]);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const peakHour = hourlyData.sort((a, b) => b.count - a.count)[0];

    const prompt = `Restaurant stats for today:
    - Total revenue: ₹${todayRevenue.toFixed(2)}
    - Total orders: ${todayOrders.length}
    - Top selling items: ${topItems.map(i => i._id).join(', ')}
    - Peak hour: ${peakHour ? peakHour._id + ':00' : 'No peak yet'}
    
    Give 3 actionable business insights. Respond STRICTLY with ONLY a JSON object in this format:
    { "insights": [{ "title": "...", "description": "...", "type": "positive/warning/tip" }], "summary": "..." }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    res.json({
      success: true,
      data: {
        ...parsed,
        stats: { todayRevenue, todayOrders: todayOrders.length, topItems, peakHour: peakHour?._id },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/ai/table-suggestion
const suggestTable = async (req, res) => {
  try {
    const { restaurantId, guestCount, preferences, timeSlot } = req.body;

    const availableTables = await Table.find({
      restaurantId,
      status: 'available',
      seatingCapacity: { $gte: guestCount },
    });

    const prompt = `Customer needs a table for ${guestCount} people at ${timeSlot || 'now'}.
    Preferences: ${preferences || 'none'}
    Available tables: ${JSON.stringify(availableTables.map(t => ({ number: t.tableNumber, type: t.tableType, capacity: t.seatingCapacity, features: t.features })))}
    
    Suggest the best table and explain why. Respond STRICTLY with ONLY a JSON object in this format:
    { "tableId": "...", "tableNumber": "...", "reason": "...", "alternatives": ["T2", "T5"] }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getFoodRecommendations, chatWithAI, getRestaurantInsights, suggestTable };
