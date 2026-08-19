const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// GET all menu items
router.get('/', protect, async (req, res) => {
  try {
    const { restaurantId, category, isVeg, isAvailable, search, page = 1, limit = 200 } = req.query;
    const filter = {};

    // Filter by restaurant only if valid and not empty
    if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
      filter.restaurantId = restaurantId;
    }

    // Category filter with case-insensitive & synonym mapping
    if (category && category !== 'all' && category !== 'ALL') {
      const catLower = category.toLowerCase().trim().replace(/ /g, '_');
      if (catLower === 'starters' || catLower === 'starter') {
        filter.category = { $in: ['starters', 'starter', 'Starters', 'Starter', 'STARTERS'] };
      } else if (catLower === 'main_course' || catLower === 'main' || catLower === 'maincourse') {
        filter.category = { $in: ['main_course', 'main course', 'main', 'Main Course', 'Main', 'MAIN COURSE', 'MAIN_COURSE'] };
      } else if (catLower === 'desserts' || catLower === 'dessert') {
        filter.category = { $in: ['desserts', 'dessert', 'Desserts', 'Dessert', 'DESSERTS'] };
      } else if (catLower === 'drinks' || catLower === 'drink') {
        filter.category = { $in: ['drinks', 'drink', 'Drinks', 'Drink', 'DRINKS'] };
      } else if (catLower === 'combos' || catLower === 'combo') {
        filter.category = { $in: ['combos', 'combo', 'Combos', 'Combo', 'COMBOS'] };
      } else if (catLower === 'snacks' || catLower === 'snack') {
        filter.category = { $in: ['snacks', 'snack', 'Snacks', 'Snack', 'SNACKS'] };
      } else {
        filter.category = { $regex: new RegExp(`^${catLower}$`, 'i') };
      }
    }

    if (isVeg !== undefined && isVeg !== '') filter.isVeg = isVeg === 'true';
    if (isAvailable !== undefined && isAvailable !== '') filter.isAvailable = isAvailable === 'true';
    if (search && search.trim() !== '') filter.name = { $regex: search.trim(), $options: 'i' };

    let items = await MenuItem.find(filter).sort({ sortOrder: 1, createdAt: -1 }).limit(limit * 1);
    
    // Fallback: If filtered query yielded 0 items because of restaurantId or isAvailable mismatch, fetch all items in DB
    if (items.length === 0) {
      delete filter.restaurantId;
      delete filter.isAvailable;
      items = await MenuItem.find(filter).sort({ sortOrder: 1, createdAt: -1 }).limit(limit * 1);
    }

    res.json({ success: true, data: items, total: items.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create menu item
router.post('/', protect, authorize('restaurant_admin', 'super_admin', 'waiter'), async (req, res) => {
  try {
    let { name, price, category, description, isVeg, image } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    let normCat = (category || 'starters').toLowerCase().trim().replace(/ /g, '_');
    if (normCat === 'main' || normCat === 'main_course' || normCat === 'maincourse') normCat = 'main_course';
    if (normCat === 'starter') normCat = 'starters';
    if (normCat === 'dessert') normCat = 'desserts';
    if (normCat === 'drink') normCat = 'drinks';
    if (normCat === 'combo') normCat = 'combos';
    if (normCat === 'snack') normCat = 'snacks';

    const validCats = ['starters', 'main_course', 'desserts', 'drinks', 'combos', 'breads', 'soups', 'salads', 'snacks'];
    if (!validCats.includes(normCat)) normCat = 'starters';

    // Shared restaurant ID across all staff accounts
    const targetRestaurantId = req.user.restaurantId || '60d0fe4f5311236168a109ca';

    const item = await MenuItem.create({
      restaurantId: targetRestaurantId,
      name: name.trim(),
      price: Number(price),
      category: normCat,
      description: description ? description.trim() : '',
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      isAvailable: true,
      image: image || null,
    });

    res.status(201).json({ success: true, data: item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update menu item
router.put('/:id', protect, authorize('restaurant_admin', 'super_admin', 'waiter'), async (req, res) => {
  try {
    if (req.body.category) {
      let normCat = req.body.category.toLowerCase().trim().replace(/ /g, '_');
      if (normCat === 'main' || normCat === 'main_course' || normCat === 'maincourse') normCat = 'main_course';
      if (normCat === 'starter') normCat = 'starters';
      if (normCat === 'dessert') normCat = 'desserts';
      if (normCat === 'drink') normCat = 'drinks';
      if (normCat === 'combo') normCat = 'combos';
      if (normCat === 'snack') normCat = 'snacks';
      req.body.category = normCat;
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    res.json({ success: true, data: item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PATCH toggle availability
router.patch('/:id/availability', protect, authorize('restaurant_admin', 'super_admin', 'waiter'), async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, data: { isAvailable: item.isAvailable } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE menu item
router.delete('/:id', protect, authorize('restaurant_admin', 'super_admin', 'waiter'), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET categories
router.get('/categories', protect, (req, res) => {
  res.json({ success: true, data: ['starters', 'main_course', 'desserts', 'drinks', 'combos', 'breads', 'soups', 'salads', 'snacks'] });
});

module.exports = router;
