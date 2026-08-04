import React, { useState, useEffect, useCallback } from 'react';
import { getMenu, createMenuItem, updateMenuAvailability, deleteMenuItem } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const CATEGORIES = ['all', 'starters', 'main_course', 'desserts', 'drinks', 'combos', 'breads', 'soups', 'salads', 'snacks'];
const CATEGORY_ICONS = {
  all: '🍽️', starters: '🥗', main_course: '🍛', desserts: '🍰',
  drinks: '🥤', combos: '🍱', breads: '🍞', soups: '🍜', salads: '🥙', snacks: '🍟'
};

export default function AdminMenu() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [addModal, setAddModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'starters', description: '', isVeg: true });

  const fetchMenu = useCallback(async () => {
    if (!user?.restaurantId) return;
    try {
      const res = await getMenu(user.restaurantId, activeCategory);
      setItems(res.data?.menuItems || res.data || []);
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId, activeCategory]);

  useEffect(() => {
    setLoading(true);
    fetchMenu();
  }, [fetchMenu]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) { toast.error('Item name is required'); return; }
    if (!newItem.price || newItem.price <= 0) { toast.error('Valid price is required'); return; }
    setSubmitting(true);
    try {
      await createMenuItem({ ...newItem, restaurantId: user.restaurantId, price: Number(newItem.price) });
      toast.success('Menu item added');
      setAddModal(false);
      setNewItem({ name: '', price: '', category: 'starters', description: '', isVeg: true });
      fetchMenu();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (id) => {
    setTogglingId(id);
    try {
      await updateMenuAvailability(id);
      setItems(prev => prev.map(i => i._id === id ? { ...i, isAvailable: !i.isAvailable } : i));
      toast.success('Availability updated');
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMenuItem(deleteDialog._id);
      toast.success('Item deleted');
      fetchMenu();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  if (loading) return <Spinner fullPage />;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">{items.length} items</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-icon" onClick={fetchMenu}>↻</button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add Item</button>
        </div>
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
        <EmptyState
          icon={CATEGORY_ICONS[activeCategory]}
          title="No items in this category"
          subtitle="Add menu items to get started"
          action={{ label: '+ Add Item', onClick: () => setAddModal(true) }}
        />
      ) : (
        <div className="menu-grid">
          {items.map(item => (
            <div key={item._id} className={`menu-card${!item.isAvailable ? ' unavailable' : ''}`}>
              <div className="menu-card-header">
                <div className="menu-badges">
                  <span className={`veg-badge ${item.isVeg ? 'veg' : 'nonveg'}`}>
                    {item.isVeg ? '🟢' : '🔴'}
                  </span>
                  <span className="category-badge">{item.category?.replace('_', ' ')}</span>
                </div>
                <button
                  className="icon-btn delete-btn"
                  onClick={() => setDeleteDialog(item)}
                  title="Delete item"
                >
                  🗑️
                </button>
              </div>
              <h3 className="menu-item-name">{item.name}</h3>
              {item.description && <p className="menu-item-desc">{item.description}</p>}
              <div className="menu-card-footer">
                <span className="menu-price">₹{item.price}</span>
                <div className="availability-toggle">
                  <span className="toggle-label">{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                  <button
                    className={`toggle-switch sm${item.isAvailable ? ' on' : ''}`}
                    onClick={() => handleToggleAvailability(item._id)}
                    disabled={togglingId === item._id}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Menu Item">
        <form onSubmit={handleAddItem}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Item Name</label>
              <input
                type="text" className="form-input"
                value={newItem.name}
                onChange={e => setNewItem(t => ({ ...t, name: e.target.value }))}
                placeholder="e.g. Butter Chicken"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input
                type="number" className="form-input" min="0"
                value={newItem.price}
                onChange={e => setNewItem(t => ({ ...t, price: e.target.value }))}
                placeholder="e.g. 250"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={newItem.category}
                onChange={e => setNewItem(t => ({ ...t, category: e.target.value }))}
              >
                {CATEGORIES.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="veg-toggle">
                <button
                  type="button"
                  className={`veg-btn${newItem.isVeg ? ' active-veg' : ''}`}
                  onClick={() => setNewItem(t => ({ ...t, isVeg: true }))}
                >
                  🟢 Veg
                </button>
                <button
                  type="button"
                  className={`veg-btn${!newItem.isVeg ? ' active-nonveg' : ''}`}
                  onClick={() => setNewItem(t => ({ ...t, isVeg: false }))}
                >
                  🔴 Non-Veg
                </button>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input form-textarea"
              value={newItem.description}
              onChange={e => setNewItem(t => ({ ...t, description: e.target.value }))}
              placeholder="Describe the dish..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        onConfirm={handleDelete}
        title="Delete Menu Item"
        message={`Delete "${deleteDialog?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
