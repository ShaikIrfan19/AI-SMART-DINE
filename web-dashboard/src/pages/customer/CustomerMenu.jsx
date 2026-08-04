import { useState, useEffect, useCallback } from 'react';
import { getMenu, getTables, createOrder } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const CATEGORIES = ['all', 'starters', 'main_course', 'desserts', 'drinks', 'combos', 'breads', 'soups', 'salads', 'snacks'];
const CATEGORY_ICONS = {
  all: '🍽️', starters: '🥗', main_course: '🍛', desserts: '🍰',
  drinks: '🥤', combos: '🍱', breads: '🍞', soups: '🍜', salads: '🥙', snacks: '🍟'
};

export default function CustomerMenu() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [orderModal, setOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  const restaurantId = user?.restaurantId || '';

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, tablesRes] = await Promise.all([
        getMenu(restaurantId, activeCategory, true),
        restaurantId ? getTables(restaurantId) : Promise.resolve({ data: [] }),
      ]);
      setItems(menuRes.data?.menuItems || menuRes.data || []);
      const allTables = tablesRes.data?.tables || tablesRes.data || [];
      setTables(allTables.filter(t => t.status === 'available'));
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, activeCategory]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item._id);
      if (existing) return prev.map(c => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast.info(`${item.name} added to cart`);
  };

  const removeFromCart = (menuItemId) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (existing?.quantity === 1) return prev.filter(c => c.menuItemId !== menuItemId);
      return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!selectedTable) { toast.error('Please select a table'); return; }
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setPlacingOrder(true);
    try {
      await createOrder({
        restaurantId,
        tableId: selectedTable,
        items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      });
      toast.success('Order placed successfully! 🎉');
      setCart([]);
      setOrderModal(false);
      setCartOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) return <Spinner fullPage />;

  return (
    <div className="tab-content" style={{ paddingBottom: cartCount > 0 ? '100px' : '0' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Our Menu</h1>
          <p className="page-subtitle">Fresh, delicious food made for you</p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={fetchData}>↻</button>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`category-tab${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            <span>{cat.replace('_', ' ')}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CATEGORY_ICONS[activeCategory]} title="No items here" subtitle="Try another category" />
      ) : (
        <div className="menu-grid">
          {items.map(item => {
            const inCart = cart.find(c => c.menuItemId === item._id);
            return (
              <div key={item._id} className="menu-card customer-menu-card">
                <div className="menu-card-header">
                  <div className="menu-badges">
                    <span className={`veg-badge ${item.isVeg ? 'veg' : 'nonveg'}`}>
                      {item.isVeg ? '🟢' : '🔴'}
                    </span>
                    <span className="category-badge">{item.category?.replace('_', ' ')}</span>
                  </div>
                </div>
                <h3 className="menu-item-name">{item.name}</h3>
                {item.description && <p className="menu-item-desc">{item.description}</p>}
                <div className="menu-card-footer">
                  <span className="menu-price">₹{item.price}</span>
                  {inCart ? (
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => removeFromCart(item._id)}>−</button>
                      <span className="qty-value">{inCart.quantity}</span>
                      <button className="qty-btn" onClick={() => addToCart(item)}>+</button>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Floating Bar */}
      {cartCount > 0 && (
        <div className="cart-bar" onClick={() => setOrderModal(true)}>
          <div className="cart-bar-left">
            <span className="cart-count-badge">{cartCount}</span>
            <span>View Cart</span>
          </div>
          <span className="cart-total">₹{cartTotal}</span>
        </div>
      )}

      {/* Order Modal */}
      <Modal isOpen={orderModal} onClose={() => setOrderModal(false)} title="Your Cart" size="lg">
        <div className="cart-items">
          {cart.map(item => (
            <div key={item.menuItemId} className="cart-item">
              <span className="cart-item-name">{item.name}</span>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => removeFromCart(item.menuItemId)}>−</button>
                <span className="qty-value">{item.quantity}</span>
                <button className="qty-btn" onClick={() => addToCart({ _id: item.menuItemId, name: item.name, price: item.price })}>+</button>
              </div>
              <span className="cart-item-price">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="cart-total-row">
            <span>Total</span>
            <span className="cart-grand-total">₹{cartTotal}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Select Table</label>
          <select
            className="form-input"
            value={selectedTable}
            onChange={e => setSelectedTable(e.target.value)}
          >
            <option value="">-- Choose a table --</option>
            {tables.map(t => (
              <option key={t._id} value={t._id}>Table {t.tableNumber} ({t.seatingCapacity} seats)</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setOrderModal(false)}>Close</button>
          <button
            className="btn btn-primary"
            onClick={handlePlaceOrder}
            disabled={placingOrder || !selectedTable}
          >
            {placingOrder ? <Spinner size="sm" /> : `Place Order • ₹${cartTotal}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
