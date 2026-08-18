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

    const systemPrompt = `You are "Smart Dine AI", a friendly restaurant assistant for AI Smart Dine application.
You answer questions about food, menu items, restaurant details, food recommendations, prices, reservations, orders, bills, and general restaurant questions.
Always use ₹ (Indian Rupees) whenever discussing prices.
Be helpful, friendly, and concise. Maintain context of previous conversation.`;

    let replyText = '';

    // Primary: Try OpenAI API if OPENAI_API_KEY is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const messages = [
          { role: 'system', content: systemPrompt },
        ];

        if (Array.isArray(conversationHistory)) {
          conversationHistory.forEach(h => {
            if (h.role && h.content) {
              messages.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: h.content });
            }
          });
        }

        messages.push({ role: 'user', content: message });

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 250,
          temperature: 0.7,
        });

        replyText = completion.choices[0]?.message?.content;
      } catch (err) {
        console.error('OpenAI API call failed, falling back to Groq:', err.message);
      }
    }

    // Secondary / Fallback: Groq SDK
    if (!replyText && process.env.GROQ_API_KEY) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
        ];

        if (Array.isArray(conversationHistory)) {
          conversationHistory.forEach(h => {
            if (h.role && h.content) {
              messages.push({ role: h.role === 'model' || h.role === 'ai' ? 'assistant' : h.role, content: h.content });
            }
          });
        }

        messages.push({ role: 'user', content: message });

        const completion = await groq.chat.completions.create({
          messages: messages,
          model: MODEL,
        });

        replyText = completion.choices[0]?.message?.content;
      } catch (err) {
        console.error('Groq API call failed:', err.message);
      }
    }

    // Default friendly response if no API keys are present or calls fail
    if (!replyText) {
      replyText = "Hello! I am Smart Dine AI, your restaurant assistant. What type of food or recommendation are you looking for today?";
    }

    res.json({
      success: true,
      message: replyText
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'I am having trouble processing that request right now. Please try again!' });
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
