import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  X,
  Filter,
  ArrowUpDown,
  Check,
  Clock,
  User,
  CreditCard,
  Banknote,
  Minus,
  Receipt,
  MessageCircle,
} from 'lucide-react';
import {
  subscribeToFoodItems,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
  updateFoodStock,
  recordFoodSale,
  subscribeToFoodSales,
} from '../../firebase/firestore';
import { isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import { useToast } from '../../context/ToastContext';

// Available preset images for quick selection
const PRESET_IMAGES = [
  { label: 'Pizza', url: '/images/pizza.jpg' },
  { label: 'Burger', url: '/images/burger.jpg' },
  { label: 'Fries', url: '/images/french-fries.jpg' },
  { label: 'Vadapav', url: '/images/vadapav.jpg' },
  { label: 'Momos', url: '/images/momos.jpg' },
  { label: 'Ice Cream', url: '/images/icecream.jpg' },
  { label: 'Cold Drink', url: '/images/cold-drinks.jpg' },
  { label: 'Snacks/More', url: '/images/more-items.jpg' },
];

const CATEGORIES = ['All', 'Snacks', 'Beverages', 'Desserts', 'Fast Food', 'Others'];

export default function AdminFood() {
  const toast = useToast();
  const isAdmin = isAdminLoggedIn();
  const isStaff = isStaffLoggedIn();
  const currentStaff = getStaffUser();

  const [foodItems, setFoodItems] = useState([]);
  const [foodSales, setFoodSales] = useState([]);
  const [activeTab, setActiveTab] = useState(() => (isAdmin ? 'inventory' : 'pos')); // 'inventory' | 'pos' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Security guard: staff cannot access inventory tab
  useEffect(() => {
    if (!isAdmin && activeTab === 'inventory') {
      setActiveTab('pos');
    }
  }, [isAdmin, activeTab]);

  // Modal State for Add / Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Snacks',
    price: '',
    stock: '',
    unit: 'pcs',
    image: '/images/more-items.jpg',
    desc: '',
    isAvailable: true,
  });

  // Stock Adjustment Modal
  const [stockModalItem, setStockModalItem] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState('');

  // POS / Quick Sale Cart State
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [tableOrStation, setTableOrStation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'upi'
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState(null);

  // Subscribe to real-time food items and sales
  useEffect(() => {
    const unsubItems = subscribeToFoodItems((items) => {
      setFoodItems(items);
    });
    const unsubSales = subscribeToFoodSales((sales) => {
      setFoodSales(sales);
    });
    return () => {
      if (typeof unsubItems === 'function') unsubItems();
      if (typeof unsubSales === 'function') unsubSales();
    };
  }, []);

  // Filtered Food Items
  const filteredItems = foodItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.desc || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate Metrics
  const totalProducts = foodItems.length;
  const totalStockUnits = foodItems.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
  const lowStockItems = foodItems.filter((item) => Number(item.stock) <= 10 && Number(item.stock) > 0);
  const outOfStockItems = foodItems.filter((item) => Number(item.stock) <= 0);

  // Today's Sales Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = foodSales.filter((sale) => {
    const saleDate = sale.date || (sale.createdAt ? sale.createdAt.slice(0, 10) : '');
    return saleDate === todayStr;
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const todayCashRevenue = todaySales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const todayUpiRevenue = todaySales
    .filter((s) => s.paymentMethod === 'upi')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  // Open Add Product Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Snacks',
      price: '',
      stock: '20',
      unit: 'pcs',
      image: '/images/more-items.jpg',
      desc: '',
      isAvailable: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'Snacks',
      price: item.price || '',
      stock: item.stock !== undefined ? String(item.stock) : '',
      unit: item.unit || 'pcs',
      image: item.image || '/images/more-items.jpg',
      desc: item.desc || '',
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    });
    setIsModalOpen(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.warning('Required Fields', 'Please enter product name and price.');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
        unit: formData.unit.trim() || 'pcs',
        image: formData.image,
        desc: formData.desc.trim(),
        isAvailable: Number(formData.stock) > 0 && formData.isAvailable,
      };

      if (editingItem) {
        await updateFoodItem(editingItem.id, payload);
        toast.success('Product Updated', `${payload.name} has been updated.`);
      } else {
        await addFoodItem(payload);
        toast.success('Product Added', `${payload.name} added to cafe catalog.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Error', err.message || 'Failed to save product.');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from catalog?`)) {
      return;
    }
    try {
      await deleteFoodItem(item.id);
      toast.info('Deleted', `${item.name} removed from inventory.`);
    } catch (err) {
      toast.error('Error', err.message || 'Failed to delete product.');
    }
  };

  // Quick Stock Adjustment (+/- amount)
  const handleQuickStockChange = async (item, delta) => {
    const current = Number(item.stock) || 0;
    const nextVal = Math.max(0, current + delta);
    try {
      await updateFoodStock(item.id, nextVal);
      toast.success('Stock Updated', `${item.name}: ${nextVal} ${item.unit || 'units'}`);
    } catch (err) {
      toast.error('Error', 'Could not update stock.');
    }
  };

  // Open Bulk Stock Modal
  const handleOpenStockModal = (item) => {
    setStockModalItem(item);
    setStockAdjustment(String(item.stock || 0));
  };

  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    if (!stockModalItem) return;
    const newStock = Math.max(0, Number(stockAdjustment) || 0);
    try {
      await updateFoodStock(stockModalItem.id, newStock);
      toast.success('Inventory Updated', `${stockModalItem.name} stock set to ${newStock}.`);
      setStockModalItem(null);
    } catch (err) {
      toast.error('Error', 'Failed to update stock.');
    }
  };

  // ── CART / POS METHODS ──
  const addToCart = (item) => {
    if (Number(item.stock) <= 0) {
      toast.warning('Out of Stock', `${item.name} is currently out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        if (existing.quantity >= Number(item.stock)) {
          toast.warning('Stock Limit', `Only ${item.stock} available in stock.`);
          return prev;
        }
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            const maxStock = Number(item.stock) || 999;
            if (nextQty > maxStock) {
              toast.warning('Stock Limit', `Maximum ${maxStock} in stock.`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);

  const cartTotalAmount = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0
  );

  // Submit Food Order Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.warning('Cart Empty', 'Please select at least one item to sell.');
      return;
    }

    setIsProcessingSale(true);
    const handlerName = isAdmin ? 'Super Admin' : currentStaff?.name || 'Staff Counter';
    const handlerId = isAdmin ? 'admin' : currentStaff?.id || 'staff';

    const salePayload = {
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        stock: item.stock,
        subtotal: item.price * item.quantity,
      })),
      totalAmount: cartTotalAmount,
      totalItemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
      customerName: customerName.trim() || 'Walk-in Gamer',
      tableOrStation: tableOrStation.trim() || 'Counter',
      paymentMethod, // 'cash' | 'upi'
      handledBy: handlerName,
      staffId: handlerId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };

    try {
      const saleId = await recordFoodSale(salePayload);
      toast.success('Sale Completed!', `₹${cartTotalAmount} billed via ${paymentMethod.toUpperCase()}.`);
      setLastCompletedSale({ ...salePayload, id: saleId });
      clearCart();
      setCustomerName('');
      setTableOrStation('');
    } catch (err) {
      toast.error('Sale Error', err.message || 'Failed to record sale.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // WhatsApp Bill Generator
  const getWhatsAppReceiptUrl = (sale) => {
    if (!sale) return '';
    const itemLines = sale.items
      .map((i) => `• ${i.name} x ${i.quantity} = ₹${i.subtotal}`)
      .join('\n');
    const msg = `🧾 *TS GAMING CAFE — Food & Snacks Bill*
👤 Customer: ${sale.customerName}
🎮 Station/Table: ${sale.tableOrStation}
📅 Date: ${sale.date} (${sale.time})
------------------------
${itemLines}
------------------------
💰 *Total Amount: ₹${sale.totalAmount}*
💳 Payment: ${sale.paymentMethod.toUpperCase()}
👨‍💼 Billed by: ${sale.handledBy}
📍 TS Gaming Cafe, Waluj, Aurangabad`;

    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="admin-page">
      {/* ── Header ── */}
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">
            {isAdmin ? 'Cafe Food & Stock Management' : 'Cafe POS Counter & Billing'}
          </h1>
          <p className="admin-page__subtitle">
            {isAdmin
              ? '👑 Super Admin: Manage stock inventory, pricing & audit food sales'
              : '👤 Staff Desk: Quick Cafe Food & Drinks POS billing counter'}
          </p>
        </div>

        <div className="admin-header-actions" style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={handleOpenAdd} id="btn-add-food-product">
              <Plus size={16} /> Add New Product
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Stat Cards ── */}
      <div className="stats-grid">
        {isAdmin && (
          <>
            <div className="stat-card glass">
              <div className="stat-card__icon" style={{ background: 'rgba(255, 85, 0, 0.12)', color: '#ff5500', border: '1px solid rgba(255, 85, 0, 0.25)' }}>
                <Coffee size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{totalProducts}</div>
                <div className="stat-card__label">Total Products</div>
              </div>
            </div>

            <div className="stat-card glass">
              <div className="stat-card__icon" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <Package size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{totalStockUnits}</div>
                <div className="stat-card__label">Total Stock Units</div>
              </div>
            </div>

            <div className="stat-card glass">
              <div className="stat-card__icon" style={{
                background: lowStockItems.length > 0 || outOfStockItems.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                color: lowStockItems.length > 0 || outOfStockItems.length > 0 ? '#ef4444' : '#22c55e',
                border: lowStockItems.length > 0 || outOfStockItems.length > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(34, 197, 94, 0.25)',
              }}>
                <AlertTriangle size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value" style={{ color: outOfStockItems.length > 0 ? '#ef4444' : lowStockItems.length > 0 ? '#f59e0b' : '#22c55e' }}>
                  {outOfStockItems.length > 0 || lowStockItems.length > 0
                    ? `${outOfStockItems.length} out / ${lowStockItems.length} low`
                    : 'All In Stock'}
                </div>
                <div className="stat-card__label">Stock Alerts</div>
              </div>
            </div>
          </>
        )}

        <div className="stat-card glass">
          <div className="stat-card__icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value text-orange">₹{todayRevenue}</div>
            <div className="stat-card__label">Today's Sales</div>
            <div className="stat-card__sublabel">💵 ₹{todayCashRevenue} • 📱 ₹{todayUpiRevenue}</div>
          </div>
        </div>

        {!isAdmin && (
          <div className="stat-card glass">
            <div className="stat-card__icon" style={{ background: 'rgba(147, 51, 234, 0.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(147, 51, 234, 0.25)' }}>
              <Receipt size={24} />
            </div>
            <div className="stat-card__content">
              <div className="stat-card__value">{todaySales.length}</div>
              <div className="stat-card__label">Orders Billed Today</div>
              <div className="stat-card__sublabel">👤 Shift: {currentStaff?.name || 'Staff'}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Tab Navigation ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '10px',
        marginBottom: '1.25rem',
      }}>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('inventory')}
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Package size={16} /> <span>Stock Inventory ({totalProducts})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('pos')}
          className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}
        >
          <ShoppingCart size={16} /> <span>Cafe POS Billing</span>
          {cart.length > 0 && (
            <span style={{
              background: '#ff5500',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '999px',
            }}>
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Receipt size={16} /> <span>Sales Records ({todaySales.length} Today)</span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: STOCK & PRODUCTS INVENTORY (ADMIN ONLY)
          ============================================================ */}
      {!isAdmin && activeTab === 'inventory' && (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--color-danger)' }}>Access Restricted</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Inventory access is disabled for staff. Only the super admin can manage inventory.
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab('pos')} style={{ marginTop: '14px' }}>
            Go to Cafe POS Billing →
          </button>
        </div>
      )}

      {isAdmin && activeTab === 'inventory' && (
        <div>
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--color-bg-card)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            marginBottom: '1.25rem',
          }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
              <input
                type="text"
                placeholder="Search food item, beverage or snack..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-form-input"
                style={{ paddingLeft: '34px', width: '100%' }}
              />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? 'var(--color-primary)' : 'var(--color-border)',
                    background: selectedCategory === cat ? 'rgba(255, 85, 0, 0.15)' : 'transparent',
                    color: selectedCategory === cat ? '#ff5500' : 'var(--color-text-dim)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {filteredItems.map((item) => {
              const stock = Number(item.stock) || 0;
              const isOutOfStock = stock <= 0;
              const isLowStock = stock > 0 && stock <= 10;

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, border-color 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Top Image & Badge */}
                  <div style={{ position: 'relative', height: '140px', background: '#0a0b10' }}>
                    <img
                      src={item.image || '/images/more-items.jpg'}
                      alt={item.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: isOutOfStock ? 'grayscale(0.8) brightness(0.6)' : 'none',
                      }}
                      onError={(e) => {
                        e.target.src = '/images/more-items.jpg';
                      }}
                    />

                    {/* Stock Status Pill */}
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: isOutOfStock
                        ? 'rgba(239, 68, 68, 0.9)'
                        : isLowStock
                        ? 'rgba(245, 158, 11, 0.9)'
                        : 'rgba(34, 197, 94, 0.9)',
                      color: '#fff',
                      backdropFilter: 'blur(4px)',
                    }}>
                      {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? `LOW (${stock} left)` : `IN STOCK (${stock} ${item.unit || 'pcs'})`}
                    </div>

                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 10,
                      background: 'rgba(0,0,0,0.7)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--color-primary-light)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {item.category || 'Snacks'}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                        {item.name}
                      </h3>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ff5500' }}>
                        ₹{item.price}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-dim)',
                      margin: '0 0 12px 0',
                      lineHeight: 1.4,
                      flex: 1,
                    }}>
                      {item.desc || 'Fresh cafe snack item'}
                    </p>

                    {/* Stock Adjustment Controls */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Current Stock: <strong style={{ color: '#fff' }}>{stock} {item.unit || 'pcs'}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '3px 7px', height: 'auto', fontSize: '0.8rem' }}
                          onClick={() => handleQuickStockChange(item, -1)}
                          title="Deduct 1"
                          disabled={stock <= 0}
                        >
                          <Minus size={12} />
                        </button>

                        <button
                          className="btn btn-ghost"
                          style={{ padding: '3px 7px', height: 'auto', fontSize: '0.8rem' }}
                          onClick={() => handleQuickStockChange(item, 5)}
                          title="Add 5"
                        >
                          +5
                        </button>

                        <button
                          className="btn btn-ghost"
                          style={{ padding: '3px 7px', height: 'auto', fontSize: '0.75rem', color: '#ffaa00' }}
                          onClick={() => handleOpenStockModal(item)}
                          title="Set Stock"
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem', justifyContent: 'center' }}
                        onClick={() => {
                          addToCart(item);
                          setActiveTab('pos');
                        }}
                        disabled={isOutOfStock}
                      >
                        <ShoppingCart size={14} /> Sell Item
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '7px 10px', fontSize: '0.82rem' }}
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            className="btn btn-ghost"
                            style={{ padding: '7px 10px', fontSize: '0.82rem', color: '#ef4444' }}
                            onClick={() => handleDeleteProduct(item)}
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              marginTop: '1rem',
            }}>
              <Coffee size={40} style={{ color: 'var(--color-text-dim)', marginBottom: '10px' }} />
              <h3 style={{ color: '#fff', marginBottom: '6px' }}>No Food Items Found</h3>
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>
                Try changing your search keyword or selected category filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: CAFE POS / QUICK SALE DESK
          ============================================================ */}
      {activeTab === 'pos' && (
        <div className="admin-food-pos-grid">
          {/* Left Column: Quick Menu Items Grid */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Select Items to Bill
              </h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: selectedCategory === cat ? 'var(--color-primary)' : 'var(--color-border)',
                      background: selectedCategory === cat ? 'rgba(255, 85, 0, 0.15)' : 'transparent',
                      color: selectedCategory === cat ? '#ff5500' : 'var(--color-text-dim)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
            }}>
              {filteredItems.map((item) => {
                const isOutOfStock = Number(item.stock) <= 0;
                const inCart = cart.find((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    style={{
                      background: inCart ? 'rgba(255, 85, 0, 0.1)' : 'var(--color-bg-card)',
                      border: `1.5px solid ${inCart ? '#ff5500' : 'var(--color-border)'}`,
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ height: '80px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                      <img
                        src={item.image || '/images/more-items.jpg'}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '2px' }}>
                      {item.name}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 900, color: '#ff5500', fontSize: '0.95rem' }}>
                        ₹{item.price}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: isOutOfStock ? '#ef4444' : '#94a3b8' }}>
                        {isOutOfStock ? 'Out' : `${item.stock} left`}
                      </span>
                    </div>

                    {inCart && (
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: '#ff5500',
                        color: '#fff',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                      }}>
                        {inCart.quantity}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: POS Cart & Checkout Panel */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            position: 'sticky',
            top: '80px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} color="#ff5500" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Current Order
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={clearCart}
                  style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#ef4444' }}
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-dim)' }}>
                <Coffee size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Your order cart is empty.</p>
                <small style={{ fontSize: '0.75rem' }}>Click any food item on the left to add.</small>
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '14px' }}>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                        ₹{item.price} each
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 6px', height: 'auto' }}
                          onClick={() => updateCartQuantity(item.id, -1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', minWidth: '18px', textAlign: 'center', color: '#fff' }}>
                          {item.quantity}
                        </span>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 6px', height: 'auto' }}
                          onClick={() => updateCartQuantity(item.id, 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <strong style={{ minWidth: '55px', textAlign: 'right', color: '#ffaa00', fontSize: '0.9rem' }}>
                        ₹{item.price * item.quantity}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer & Station Info */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Staff name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="admin-form-input"
                    style={{ fontSize: '0.85rem', padding: '6px 10px', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Station / Table
                  </label>
                  <input
                    type="text"
                    placeholder="Station name"
                    value={tableOrStation}
                    onChange={(e) => setTableOrStation(e.target.value)}
                    className="admin-form-input"
                    style={{ fontSize: '0.85rem', padding: '6px 10px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${paymentMethod === 'cash' ? '#22c55e' : 'var(--color-border)'}`,
                    background: paymentMethod === 'cash' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    color: paymentMethod === 'cash' ? '#4ade80' : 'var(--color-text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <Banknote size={16} /> <span>💵 Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${paymentMethod === 'upi' ? '#38bdf8' : 'var(--color-border)'}`,
                    background: paymentMethod === 'upi' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: paymentMethod === 'upi' ? '#38bdf8' : 'var(--color-text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <CreditCard size={16} /> <span>📱 UPI / QR</span>
                </button>
              </div>

              {/* Order Total & Submit */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(255, 85, 0, 0.12)',
                borderRadius: '8px',
                marginBottom: '12px',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Bill Total:</span>
                <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#ff5500' }}>
                  ₹{cartTotalAmount}
                </span>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
                onClick={handleCompleteSale}
                disabled={isProcessingSale || cart.length === 0}
              >
                {isProcessingSale ? 'Processing Bill...' : `Complete Sale & Deduct Stock`}
              </button>
            </div>

            {/* Last Completed Sale Receipt Box */}
            {lastCompletedSale && (
              <div style={{
                marginTop: '14px',
                padding: '10px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4ade80' }}>
                    ✅ Bill Completed (₹{lastCompletedSale.totalAmount})
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 4px', height: 'auto' }}
                    onClick={() => setLastCompletedSale(null)}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '8px' }}>
                  Customer: <strong>{lastCompletedSale.customerName}</strong> • {lastCompletedSale.paymentMethod.toUpperCase()}
                </div>
                <a
                  href={getWhatsAppReceiptUrl(lastCompletedSale)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: '#25d366',
                    color: '#fff',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    width: '100%',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={14} /> Send Receipt on WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: SALES & AUDIT HISTORY
          ============================================================ */}
      {activeTab === 'history' && (
        <div>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Recent Cafe Billing Records
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                Showing last {foodSales.length} sales
              </span>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Station/Table</th>
                    <th>Items Ordered</th>
                    <th>Payment</th>
                    <th>Billed By</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {foodSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div>{sale.date}</div>
                        <small style={{ color: 'var(--color-text-dim)' }}>{sale.time}</small>
                      </td>
                      <td>
                        <strong>{sale.customerName || 'Walk-in'}</strong>
                      </td>
                      <td>{sale.tableOrStation || 'Counter'}</td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {Array.isArray(sale.items)
                            ? sale.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')
                            : 'Food Items'}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: sale.paymentMethod === 'cash' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: sale.paymentMethod === 'cash' ? '#4ade80' : '#38bdf8',
                        }}>
                          {sale.paymentMethod === 'cash' ? '💵 CASH' : '📱 UPI'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        {(sale.handledBy || 'Staff').replace(/\s*\(Staff\)/gi, '')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 900, color: '#ff5500', fontSize: '1rem' }}>
                        ₹{sale.totalAmount}
                      </td>
                    </tr>
                  ))}

                  {foodSales.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
                        No cafe sales recorded yet. Use the Cafe POS tab to record your first order!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: ADD / EDIT PRODUCT (ADMIN ONLY)
          ============================================================ */}
      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {editingItem ? 'Edit Food Product' : 'Add New Food Product'}
              </h2>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="admin-form-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Item name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="admin-form-input"
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="admin-form-label">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="admin-form-input"
                    >
                      <option value="Snacks">Snacks</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Fast Food">Fast Food</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="admin-form-label">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Price"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="admin-form-label">Initial Stock</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>

                  <div>
                    <label className="admin-form-label">Unit Type</label>
                    <input
                      type="text"
                      placeholder="Unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-form-label">Description / Ingredients</label>
                  <textarea
                    rows={2}
                    placeholder="Description"
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                    className="admin-form-input"
                  />
                </div>

                {/* Image Selection Presets */}
                <div>
                  <label className="admin-form-label">Choose Preset Image or Enter URL</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                    {PRESET_IMAGES.map((preset) => (
                      <div
                        key={preset.label}
                        onClick={() => setFormData({ ...formData, image: preset.url })}
                        style={{
                          border: `1.5px solid ${formData.image === preset.url ? '#ff5500' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '6px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: '#000',
                          textAlign: 'center',
                        }}
                      >
                        <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '40px', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.65rem', color: '#cbd5e1', display: 'block', padding: '2px' }}>{preset.label}</span>
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Custom image path e.g. /images/pizza.jpg"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="admin-form-input"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingItem ? 'Save Changes' : 'Add to Catalog'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: QUICK STOCK SET / REPLENISH
          ============================================================ */}
      {stockModalItem && (
        <div className="admin-modal-overlay" onClick={() => setStockModalItem(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Adjust Stock: {stockModalItem.name}
              </h3>
              <button className="btn btn-ghost" onClick={() => setStockModalItem(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment}>
              <div style={{ marginBottom: '14px' }}>
                <label className="admin-form-label">Total Stock Quantity ({stockModalItem.unit || 'units'})</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  className="admin-form-input"
                  style={{ fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                  autoFocus
                />
              </div>

              {/* Quick Increment Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {[10, 25, 50, 100].map((addAmt) => (
                  <button
                    key={addAmt}
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: '4px', fontSize: '0.78rem' }}
                    onClick={() => setStockAdjustment(String((Number(stockAdjustment) || 0) + addAmt))}
                  >
                    +{addAmt}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Update Stock
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setStockModalItem(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
