import { createSlice } from '@reduxjs/toolkit';

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: {
    current: null,
    list: [],
    loading: false,
  },
  reducers: {
    setCurrentRestaurant: (state, action) => {
      state.current = action.payload;
    },
    setRestaurantList: (state, action) => {
      state.list = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCurrentRestaurant, setRestaurantList, setLoading } = restaurantSlice.actions;
export default restaurantSlice.reducer;
