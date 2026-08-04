import api from './axios';

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);

// Tables
export const getTables = (restaurantId) => api.get(`/tables?restaurantId=${restaurantId}`);
export const createTable = (data) => api.post('/tables', data);
export const updateTableStatus = (id, status) => api.patch(`/tables/${id}/status`, { status });
export const deleteTable = (id) => api.delete(`/tables/${id}`);

// Menu
export const getMenu = (restaurantId, category, isAvailable) => {
  let url = `/menu?restaurantId=${restaurantId}`;
  if (category && category !== 'all') url += `&category=${category}`;
  if (isAvailable !== undefined) url += `&isAvailable=${isAvailable}`;
  return api.get(url);
};
export const createMenuItem = (data) => api.post('/menu', data);
export const updateMenuAvailability = (id) => api.patch(`/menu/${id}/availability`);
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`);

// Orders
export const getOrders = () => api.get('/orders');
export const getLiveOrders = () => api.get('/orders/live');
export const createOrder = (data) => api.post('/orders', data);
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status });

// Staff
export const getStaff = () => api.get('/staff');
export const createStaff = (data) => api.post('/staff', data);
export const updateStaffStatus = (id, isActive) => api.patch(`/staff/${id}/status`, { isActive });

// Analytics
export const getDashboardAnalytics = (period, restaurantId) => {
  let url = `/analytics/dashboard?period=${period}`;
  if (restaurantId) url += `&restaurantId=${restaurantId}`;
  return api.get(url);
};

// Restaurants
export const updateRestaurant = (id, data) => api.patch(`/restaurants/${id}`, data);

// Users
export const updateProfile = (data) => api.put('/users/profile', data);
