const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getFoodRecommendations, chatWithAI, getRestaurantInsights, suggestTable } = require('../controllers/ai.controller');

const router = express.Router();

// ── PUBLIC: Chatbot endpoint (no auth required so any user/guest can chat) ────
router.post('/chat', chatWithAI);

// ── PROTECTED routes ──────────────────────────────────────────────────────────
router.use(protect);
router.post('/recommendations', getFoodRecommendations);
router.get('/insights/:restaurantId', getRestaurantInsights);
router.post('/suggest-table', suggestTable);

module.exports = router;
