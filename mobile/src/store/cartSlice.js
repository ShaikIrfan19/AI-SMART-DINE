import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    restaurantId: null,
    tableId: null,
    tableNumber: null,
    notes: '',
  },
  reducers: {
    setTableInfo: (state, action) => {
      state.restaurantId = action.payload.restaurantId;
      state.tableId = action.payload.tableId;
      state.tableNumber = action.payload.tableNumber;
    },
    addItem: (state, action) => {
      const { menuItemId, name, price, isVeg, image, quantity = 1, notes, addons = [] } = action.payload;
      const existing = state.items.find(i => i.menuItemId === menuItemId);
      if (existing) {
        existing.quantity += quantity;
        existing.totalPrice = existing.price * existing.quantity;
      } else {
        state.items.push({
          menuItemId, name, price, isVeg, image,
          quantity,
          totalPrice: price * quantity,
          notes: notes || '',
          addons,
        });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i.menuItemId !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { menuItemId, quantity } = action.payload;
      const item = state.items.find(i => i.menuItemId === menuItemId);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(i => i.menuItemId !== menuItemId);
        } else {
          item.quantity = quantity;
          item.totalPrice = item.price * quantity;
        }
      }
    },
    updateItemNotes: (state, action) => {
      const { menuItemId, notes } = action.payload;
      const item = state.items.find(i => i.menuItemId === menuItemId);
      if (item) item.notes = notes;
    },
    setOrderNotes: (state, action) => {
      state.notes = action.payload;
    },
    clearCart: (state) => {
      state.items = [];
      state.notes = '';
    },
  },
});

export const { setTableInfo, addItem, removeItem, updateQuantity, updateItemNotes, setOrderNotes, clearCart } = cartSlice.actions;

// Selectors
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.totalPrice, 0);

export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export default cartSlice.reducer;
