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
  Printer,
  Share2,
  UploadCloud,
  Image as ImageIcon,
} from 'lucide-react';
import {
  subscribeToFoodItems,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
  updateFoodStock,
  recordFoodSale,
  subscribeToFoodSales,
  deleteFoodSale,
  updateFoodSale,
} from '../../firebase/firestore';
import { isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import { useToast } from '../../context/ToastContext';
import { processAndCompressImage, MAX_IMAGE_SIZE_KB } from '../../utils/imageCompressor';
import './AdminFood.css';

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
  const [activeTab, setActiveTab] = useState('pos'); // 'inventory' | 'pos' | 'history'
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);

  // Stock Adjustment Modal
  const [stockModalItem, setStockModalItem] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState('');

  // POS / Quick Sale Cart State
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableOrStation, setTableOrStation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'upi'
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState(null);
  const [selectedBillSale, setSelectedBillSale] = useState(null); // Thermal Bill Receipt Modal

  // Edit Bill / Sales Record State
  const [editingSale, setEditingSale] = useState(null);
  const [editSaleForm, setEditSaleForm] = useState({
    customerName: '',
    customerPhone: '',
    stationNumber: '',
    paymentMethod: 'cash',
    items: [],
  });

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
    setUploadedFileInfo(null);
    setFormData({
      name: '',
      category: 'Snacks',
      price: '',
      stock: '20',
      unit: 'pcs',
      image: '',
      desc: '',
      isAvailable: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setUploadedFileInfo(null);
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
        image: formData.image || '/images/more-items.jpg',
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

  // Upload image from user device and strictly enforce 500KB limit
  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await processAndCompressImage(file, MAX_IMAGE_SIZE_KB, 1200);
      setFormData((prev) => ({ ...prev, image: res.dataUrl }));
      setUploadedFileInfo({
        name: res.fileName,
        sizeKB: res.sizeKB,
        originalKB: res.originalKB,
      });
      toast.success(
        'Image Uploaded! 📷',
        `${res.fileName} optimized to ${res.sizeKB}KB (within 500KB limit).`
      );
    } catch (err) {
      console.warn('Image upload error:', err);
      toast.error('Image Error', err.message || 'Failed to process image under 500KB.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
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

  // ─── BILL EDIT & DELETE HANDLERS ─────────────────────────────
  const handleOpenEditBill = (sale) => {
    setEditingSale(sale);
    setEditSaleForm({
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      stationNumber: sale.tableOrStation || sale.stationNumber || '',
      paymentMethod: sale.paymentMethod || 'cash',
      items: Array.isArray(sale.items) ? sale.items.map((i) => ({ ...i })) : [],
    });
  };

  const handleEditBillItemQty = (index, delta) => {
    setEditSaleForm((prev) => {
      const items = [...prev.items];
      const newQty = (items[index].quantity || 1) + delta;
      if (newQty <= 0) {
        items.splice(index, 1);
      } else {
        items[index] = { ...items[index], quantity: newQty };
      }
      return { ...prev, items };
    });
  };

  const handleSaveEditBill = async (e) => {
    e.preventDefault();
    if (!editingSale) return;

    if (editSaleForm.items.length === 0) {
      toast.warning('Empty Bill', 'Bill must have at least one item. Or delete the bill instead.');
      return;
    }

    const newTotal = editSaleForm.items.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );

    try {
      const updatedData = {
        customerName: editSaleForm.customerName.trim() || 'Walk-in Customer',
        customerPhone: editSaleForm.customerPhone.trim(),
        tableOrStation: editSaleForm.stationNumber.trim() || 'Counter',
        paymentMethod: editSaleForm.paymentMethod,
        items: editSaleForm.items,
        totalAmount: newTotal,
      };

      await updateFoodSale(editingSale.id, updatedData);
      toast.success('Bill Updated 🧾', `Bill updated successfully (New Total: ₹${newTotal}).`);

      const merged = { ...editingSale, ...updatedData };
      setEditingSale(null);
      if (selectedBillSale?.id === editingSale.id) setSelectedBillSale(merged);
      if (lastCompletedSale?.id === editingSale.id) setLastCompletedSale(merged);
    } catch (err) {
      toast.error('Update Error', err.message || 'Could not update bill.');
    }
  };

  const handleDeleteBill = async (sale) => {
    const saleIdShort = sale.id ? sale.id.slice(0, 8) : 'Sale';
    const confirmMsg = `Are you sure you want to delete Bill #${saleIdShort} (₹${sale.totalAmount})?\n\nThis will restore sold items back into cafe inventory.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteFoodSale(sale, true);
      toast.success('Bill Deleted 🗑️', `Bill for ₹${sale.totalAmount} deleted & stock restored.`);
      if (selectedBillSale?.id === sale.id) setSelectedBillSale(null);
      if (lastCompletedSale?.id === sale.id) setLastCompletedSale(null);
      if (editingSale?.id === sale.id) setEditingSale(null);
    } catch (err) {
      toast.error('Delete Error', err.message || 'Could not delete bill record.');
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
      customerPhone: customerPhone.trim(),
      tableOrStation: tableOrStation.trim() || 'Counter Desk',
      paymentMethod, // 'cash' | 'upi'
      handledBy: handlerName,
      staffId: handlerId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };

    try {
      const saleId = await recordFoodSale(salePayload);
      const completedObj = { ...salePayload, id: saleId };
      toast.success('Sale Completed!', `₹${cartTotalAmount} billed via ${paymentMethod.toUpperCase()}.`);
      setLastCompletedSale(completedObj);
      setSelectedBillSale(completedObj);
      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      setTableOrStation('');
    } catch (err) {
      toast.error('Sale Error', err.message || 'Failed to record sale.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Formats WhatsApp Receipt Message for Cafe POS
  const generateFoodWhatsAppMessage = (sale) => {
    if (!sale) return '';
    const invoiceNum = sale.id ? String(sale.id).slice(-6).toUpperCase() : String(Date.now()).slice(-6);
    const paymentBadge = sale.paymentMethod === 'cash' ? '💵 Paid via Cash' : '📱 Paid via UPI';
    const operatorName = (sale.handledBy || 'Staff').replace(/\s*\(Staff\)/gi, '');

    const itemLines = (sale.items || [])
      .map(
        (i, idx) =>
          `  ${idx + 1}. *${i.name}*\n     ${i.quantity} × ₹${i.price} = *₹${i.subtotal}*`
      )
      .join('\n');

    return `🍟 *TS GAMING CAFÉ — FOOD & DRINKS BILL* 🥤
━━━━━━━━━━━━━━━━━━━━━━
🧾 *Bill No:* #TS-F${invoiceNum}
📅 *Date:* ${sale.date} (${sale.time || ''})
👤 *Customer:* ${sale.customerName || 'Walk-in Gamer'}
🎮 *Table / Station:* ${sale.tableOrStation || 'Counter Desk'}
━━━━━━━━━━━━━━━━━━━━━━
📋 *ITEMS BILLED:*
${itemLines}

━━━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${Number(sale.totalAmount || 0).toLocaleString('en-IN')}
💳 *Payment Mode:* ${paymentBadge} ✅
👨‍💼 *Billed By:* ${operatorName}

📍 *TS Gaming Café*, Waluj, Chhatrapati Sambhajinagar
📞 *Helpline / Orders:* +91 79724 30951
🙏 _Thank you for ordering! Enjoy your gaming session!_ 🚀🎮`;
  };

  // WhatsApp Bill Generator URL
  const getWhatsAppReceiptUrl = (sale) => {
    if (!sale) return '';
    const cleanPhone = (sale.customerPhone || '').replace(/\D/g, '').slice(-10);
    const msg = generateFoodWhatsAppMessage(sale);
    if (cleanPhone && cleanPhone.length === 10) {
      return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    }
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
      <div className="admin-food-tabs">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('inventory')}
            className={`btn admin-food-tab-btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Package size={16} /> <span>Stock Inventory ({totalProducts})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('pos')}
          className={`btn admin-food-tab-btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`}
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
          className={`btn admin-food-tab-btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
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
            <div style={{ position: 'relative', minWidth: '0', flex: '1 1 200px' }}>
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
          <div className="admin-inventory-grid">
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
                  <div style={{
                    position: 'relative',
                    height: '160px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    overflow: 'hidden',
                  }}>
                    <img
                      src={item.image || '/images/more-items.jpg'}
                      alt={item.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto',
                        filter: isOutOfStock ? 'grayscale(0.8) opacity(0.5)' : 'none',
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
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '14px',
              width: '100%',
              minWidth: 0,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                width: '100%',
              }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Select Items to Bill
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #ff5500 0%, #ff8800 100%)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(255, 85, 0, 0.35)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Plus size={13} /> Add Product
                    </button>
                  )}
                  <span style={{ fontSize: '0.78rem', color: '#ff7700', fontWeight: 700 }}>
                    ({filteredItems.length})
                  </span>
                </div>
              </div>

              {/* Horizontal Scrollable Categories */}
              <div className="admin-pos-categories-scroller">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: selectedCategory === cat ? '#ff5500' : 'rgba(255, 255, 255, 0.12)',
                      background: selectedCategory === cat ? 'linear-gradient(135deg, #ff5500 0%, #ff8800 100%)' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-pos-products-grid">
              {filteredItems.map((item) => {
                const isOutOfStock = Number(item.stock) <= 0;
                const inCart = cart.find((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    className={`admin-pos-item-card ${inCart ? 'admin-pos-item-card--in-cart' : ''} ${isOutOfStock ? 'admin-pos-item-card--out-of-stock' : ''}`}
                  >
                    {/* Top Category Badge & Stock */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      width: '100%',
                    }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#ff7700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        background: 'rgba(255, 85, 0, 0.12)',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        maxWidth: '65%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.category || 'Item'}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        color: isOutOfStock ? '#ef4444' : '#94a3b8',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {isOutOfStock ? 'Out' : `${item.stock} left`}
                      </span>
                    </div>

                    {/* Full Product Photo Container (No Cropping) */}
                    <div className="admin-pos-item-img-box">
                      <img
                        src={item.image || '/images/more-items.jpg'}
                        alt={item.name}
                        className="admin-pos-item-img"
                        onError={(e) => {
                          e.target.src = '/images/more-items.jpg';
                        }}
                      />
                    </div>

                    {/* Product Name (Fixed 2 lines for uniform card heights) */}
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#fff',
                      marginBottom: '4px',
                      lineHeight: '1.2',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '2.4em',
                    }}>
                      {item.name}
                    </div>

                    {/* Price and Cart Action Badge */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      paddingTop: '2px',
                    }}>
                      <span style={{ fontWeight: 900, color: '#ff5500', fontSize: '0.95rem' }}>
                        ₹{item.price}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: inCart ? '#ffffff' : '#ff7700',
                        background: inCart ? '#ff5500' : 'rgba(255, 85, 0, 0.12)',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}>
                        {inCart ? `${inCart.quantity} in cart` : '+ Add'}
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
          <div
            id="pos-checkout-panel"
            style={{
              background: 'var(--color-bg-card)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              position: 'sticky',
              top: '80px',
            }}
          >
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
                    Customer / Gamer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul, Shubham"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="admin-form-input"
                    style={{ fontSize: '0.85rem', padding: '6px 10px', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Phone (for WhatsApp Bill)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="admin-form-input"
                    style={{ fontSize: '0.85rem', padding: '6px 10px', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Station / Table / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. PS5 Pro #1, Table 2, Counter"
                  value={tableOrStation}
                  onChange={(e) => setTableOrStation(e.target.value)}
                  className="admin-form-input"
                  style={{ fontSize: '0.85rem', padding: '6px 10px', width: '100%' }}
                />
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
                padding: '12px',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4ade80' }}>
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
                  Customer: <strong>{lastCompletedSale.customerName}</strong> • {lastCompletedSale.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onClick={() => setSelectedBillSale(lastCompletedSale)}
                  >
                    <Receipt size={14} /> View & Print Slip
                  </button>
                  <a
                    href={getWhatsAppReceiptUrl(lastCompletedSale)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#25d366',
                      color: '#fff',
                      padding: '6px 8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={14} /> WhatsApp Bill
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Sticky Floating Cart Bar */}
          {cart.length > 0 && (
            <div
              className="mobile-pos-cart-bar"
              onClick={() => {
                document.getElementById('pos-checkout-panel')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#ff5500',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.88rem'
                }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} item{cart.length > 1 ? 's' : ''} in Bill
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Tap to view checkout & print slip</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ff5500' }}>
                  ₹{cartTotalAmount}
                </span>
                <span className="btn-checkout-pill">
                  View Bill →
                </span>
              </div>
            </div>
          )}
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

            <div className="table-responsive food-sales-desktop-table">
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
                    <th style={{ textAlign: 'center' }}>Actions</th>
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
                        {sale.customerPhone && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📱 {sale.customerPhone}</div>
                        )}
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
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setSelectedBillSale(sale)}
                            title="View / Print Receipt Slip"
                          >
                            <Receipt size={12} /> Bill
                          </button>
                          <a
                            href={getWhatsAppReceiptUrl(sale)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#25D366', padding: '4px 6px' }}
                            title="Send on WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#38bdf8', padding: '4px 6px' }}
                            onClick={() => handleOpenEditBill(sale)}
                            title="Edit Bill (Customer, Table, Items, Payment)"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444', padding: '4px 6px' }}
                            onClick={() => handleDeleteBill(sale)}
                            title="Delete Bill & Restore Inventory"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {foodSales.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
                        No cafe sales recorded yet. Use the Cafe POS tab to record your first order!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Clean Touch Cards for Recent Bills */}
            <div className="food-sales-mobile-cards">
              {foodSales.map((sale) => (
                <div key={sale.id} className="food-sale-mobile-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#fff' }}>
                        {sale.customerName || 'Walk-in Customer'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        🕒 {sale.date} {sale.time} · 📍 {sale.tableOrStation || 'Counter'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: sale.paymentMethod === 'cash' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: sale.paymentMethod === 'cash' ? '#4ade80' : '#38bdf8',
                    }}>
                      {sale.paymentMethod === 'cash' ? '💵 CASH' : '📱 UPI'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.8rem',
                    color: '#cbd5e1',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    {Array.isArray(sale.items)
                      ? sale.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')
                      : 'Items'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff5500' }}>
                      ₹{sale.totalAmount}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', fontSize: '0.74rem', fontWeight: 700 }}
                        onClick={() => setSelectedBillSale(sale)}
                      >
                        <Receipt size={13} /> Bill
                      </button>
                      <a
                        href={getWhatsAppReceiptUrl(sale)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm"
                        style={{ background: '#25d366', color: '#fff', padding: '5px 8px' }}
                      >
                        <MessageCircle size={14} />
                      </a>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#38bdf8', padding: '5px 8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                        onClick={() => handleOpenEditBill(sale)}
                        title="Edit Bill"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', padding: '5px 8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                        onClick={() => handleDeleteBill(sale)}
                        title="Delete Bill"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {foodSales.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
                  No cafe sales recorded yet. Use the Cafe POS tab to record your first order!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: ADD / EDIT PRODUCT (ADMIN ONLY)
          ============================================================ */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card admin-modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '18px',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(255, 85, 0, 0.12)',
                  border: '1px solid rgba(255, 85, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff5500',
                  flexShrink: 0
                }}>
                  <Coffee size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {editingItem ? 'Edit Food Product' : 'Add New Food Product'}
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    {editingItem ? 'Update pricing, inventory, and details for this item' : 'Add a snack, beverage or meal to your gaming cafe menu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Product Name */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    <span>Product Name <strong style={{ color: '#ff5500' }}>*</strong></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cheese Burst Pizza, Monster Energy, Peri Peri Fries"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="admin-form-input"
                    autoFocus
                  />
                </div>

                {/* Category & Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      <span>Category</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="admin-form-input"
                    >
                      <option value="Snacks">🍿 Snacks</option>
                      <option value="Beverages">🥤 Beverages</option>
                      <option value="Desserts">🍨 Desserts</option>
                      <option value="Fast Food">🍔 Fast Food</option>
                      <option value="Others">📦 Others</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      <span>Price (₹) <strong style={{ color: '#ff5500' }}>*</strong></span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#ff5500',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        pointerEvents: 'none'
                      }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="80"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="admin-form-input"
                        style={{ paddingLeft: '30px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stock & Unit */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      <span>Initial Stock Quantity</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 20"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      <span>Unit Type</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pcs, bottle, plate, pack"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                {/* Description / Ingredients */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    <span>Description / Ingredients</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Optional</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description, taste notes, or ingredients..."
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                    className="admin-form-input"
                    style={{ minHeight: '60px' }}
                  />
                </div>

                {/* Product Photo Upload Section (Max 500KB) */}
                <div className="admin-form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="admin-form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={15} color="#ff7700" />
                      <span>Product Photo</span>
                    </label>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      Max 500 KB Limit
                    </span>
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="admin-food-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleImageFileUpload}
                    disabled={uploadingImage}
                  />

                  {/* Upload Area / Large HD Preview Container */}
                  {formData.image ? (
                    <div style={{
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: '2px solid rgba(255, 85, 0, 0.5)',
                      background: '#070a13',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      position: 'relative',
                    }}>
                      {/* Large HD Preview Frame */}
                      <div style={{
                        position: 'relative',
                        height: '200px',
                        width: '100%',
                        background: 'radial-gradient(circle at center, #1e2235 0%, #080a11 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        <img
                          src={formData.image}
                          alt="Product preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />

                        {/* Top Overlay Badge & Action Buttons */}
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          right: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          pointerEvents: 'none',
                        }}>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <CheckCircle2 size={13} color="#10b981" />
                            {uploadedFileInfo ? `${uploadedFileInfo.name} (${uploadedFileInfo.sizeKB} KB)` : 'High Clarity (HD)'}
                          </span>

                          <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
                            <button
                              type="button"
                              onClick={() => document.getElementById('admin-food-file-input')?.click()}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 85, 0, 0.95)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                              }}
                            >
                              Change Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, image: '' });
                                setUploadedFileInfo(null);
                              }}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.95)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                              }}
                              title="Remove photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Full View Info */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          textAlign: 'center',
                          fontSize: '0.72rem',
                          color: '#e2e8f0',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                          padding: '12px 6px 6px',
                          fontWeight: 600,
                        }}>
                          Full Photo View · Crisp Resolution strictly under 500 KB
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadingImage && document.getElementById('admin-food-file-input')?.click()}
                      style={{
                        border: '2px dashed rgba(255, 85, 0, 0.45)',
                        borderRadius: '14px',
                        padding: '24px 16px',
                        background: 'rgba(255, 85, 0, 0.03)',
                        cursor: uploadingImage ? 'wait' : 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff5500'; e.currentTarget.style.background = 'rgba(255, 85, 0, 0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 85, 0, 0.45)'; e.currentTarget.style.background = 'rgba(255, 85, 0, 0.03)'; }}
                    >
                      {uploadingImage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <RefreshCw size={28} color="#ff7700" className="animate-spin" />
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>Optimizing Photo for HD Clarity...</div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Checking 500 KB limit & preserving full sharpness</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '12px',
                            background: 'rgba(255, 85, 0, 0.12)',
                            border: '1.5px solid rgba(255, 85, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <UploadCloud size={28} color="#ff7700" />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                              Upload Photo from Device (Phone / PC)
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                              Click or tap here to choose image · JPG, PNG, WEBP · Max 500 KB
                            </div>
                          </div>
                          <span style={{
                            marginTop: '4px',
                            display: 'inline-block',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ff5500 0%, #ff8800 100%)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            boxShadow: '0 4px 12px rgba(255, 85, 0, 0.35)',
                          }}>
                            Browse Photo
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preset Quick Images */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                      Or choose from Cafe Presets:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {PRESET_IMAGES.map((preset) => {
                        const isSelected = formData.image === preset.url;
                        return (
                          <div
                            key={preset.label}
                            onClick={() => {
                              setFormData({ ...formData, image: preset.url });
                              setUploadedFileInfo(null);
                            }}
                            style={{
                              border: `2px solid ${isSelected ? '#ff5500' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: '10px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              background: '#070a13',
                              textAlign: 'center',
                              position: 'relative',
                              transition: 'all 0.15s ease',
                              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                              boxShadow: isSelected ? '0 0 12px rgba(255, 85, 0, 0.4)' : 'none',
                            }}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              style={{ width: '100%', height: '44px', objectFit: 'cover', display: 'block' }}
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '3px',
                                right: '3px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: '#ff5500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 6px rgba(0,0,0,0.8)'
                              }}>
                                <Check size={10} color="#fff" strokeWidth={3} />
                              </div>
                            )}
                            <div style={{
                              fontSize: '0.66rem',
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? '#ff7700' : '#cbd5e1',
                              padding: '3px 2px',
                              background: isSelected ? 'rgba(255,85,0,0.1)' : 'rgba(0,0,0,0.6)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {preset.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom URL Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="text"
                      placeholder="Or enter image URL e.g. https://... or /images/item.jpg"
                      value={formData.image && !formData.image.startsWith('data:') ? formData.image : ''}
                      onChange={(e) => {
                        setFormData({ ...formData, image: e.target.value });
                        setUploadedFileInfo(null);
                      }}
                      className="admin-form-input"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: '0 0 110px',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#cbd5e1'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ff5500 0%, #ff7700 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(255, 85, 0, 0.4)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 85, 0, 0.6)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 85, 0, 0.4)'; }}
                >
                  {editingItem ? <Check size={18} /> : <Plus size={18} />}
                  {editingItem ? 'Save Changes' : 'Add to Catalog'}
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
          <div className="admin-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(255, 85, 0, 0.12)',
                  border: '1px solid rgba(255, 85, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff5500'
                }}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Adjust Stock
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#ff7700', fontWeight: 600, margin: '2px 0 0 0' }}>
                    {stockModalItem.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockModalItem(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment}>
              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label className="admin-form-label">
                  <span>Total Available Stock ({stockModalItem.unit || 'units'})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  className="admin-form-input"
                  style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', padding: '12px', color: '#ff7700' }}
                  autoFocus
                />
              </div>

              {/* Quick Increment Buttons */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Quick Add to Current:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[10, 25, 50, 100].map((addAmt) => (
                    <button
                      key={addAmt}
                      type="button"
                      style={{
                        padding: '8px 4px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,85,0,0.15)'; e.currentTarget.style.borderColor = '#ff5500'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#cbd5e1'; }}
                      onClick={() => setStockAdjustment(String((Number(stockAdjustment) || 0) + addAmt))}
                    >
                      +{addAmt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStockModalItem(null)}
                  style={{
                    flex: '0 0 100px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff5500 0%, #ff7700 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(255, 85, 0, 0.4)'
                  }}
                >
                  <Check size={16} /> Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── POS Thermal Receipt & Invoice Modal ── */}
      {selectedBillSale && (
        <div className="admin-modal-overlay" onClick={() => setSelectedBillSale(null)}>
          <div
            className="food-bill-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar (Top) */}
            <div className="food-bill-modal-actions food-receipt-no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} style={{ color: '#ff5500' }} />
                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>Cafe POS Bill Receipt</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}
                  title="Print Thermal Slip"
                >
                  <Printer size={13} /> Print
                </button>
                <a
                  href={getWhatsAppReceiptUrl(selectedBillSale)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#25d366',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                  title="Send via WhatsApp"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleOpenEditBill(selectedBillSale)}
                  style={{
                    color: '#38bdf8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: 700,
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '4px 8px',
                  }}
                  title="Edit this Bill"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDeleteBill(selectedBillSale)}
                  style={{
                    color: '#f87171',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: 700,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '4px 8px',
                  }}
                  title="Delete this Bill & Restore Stock"
                >
                  <Trash2 size={13} /> Delete
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedBillSale(null)}
                  style={{ padding: '4px 8px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Thermal Receipt Paper */}
            <div className="food-receipt-printable">
              <div className="food-receipt-header">
                <div className="food-receipt-brand">TS GAMING CAFÉ</div>
                <div className="food-receipt-sub">SNACKS · DRINKS · REFRESHMENTS</div>
                <div className="food-receipt-address">Waluj, Chhatrapati Sambhajinagar</div>
                <div className="food-receipt-phone">Helpline: +91 79724 30951</div>
              </div>

              <div className="food-receipt-divider" />

              <div className="food-receipt-meta-grid">
                <div><span>Bill No:</span> <strong>#TS-F{(selectedBillSale.id || '').slice(-6).toUpperCase() || 'NEW'}</strong></div>
                <div><span>Date:</span> <strong>{selectedBillSale.date}</strong></div>
                <div><span>Time:</span> <strong>{selectedBillSale.time || ''}</strong></div>
                <div><span>Cashier:</span> <strong>{(selectedBillSale.handledBy || 'Staff').replace(/\s*\(Staff\)/gi, '')}</strong></div>
                <div><span>Customer:</span> <strong>{selectedBillSale.customerName || 'Walk-in Gamer'}</strong></div>
                {selectedBillSale.customerPhone && (
                  <div><span>Phone:</span> <strong>+91 {selectedBillSale.customerPhone}</strong></div>
                )}
                <div><span>Station:</span> <strong>{selectedBillSale.tableOrStation || 'Counter'}</strong></div>
              </div>

              <div className="food-receipt-divider" />

              <table className="food-receipt-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBillSale.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left' }}>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.price}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="food-receipt-divider" />

              <div className="food-receipt-totals">
                <div className="food-receipt-row">
                  <span>Total Items:</span>
                  <span>{selectedBillSale.totalItemsCount || (selectedBillSale.items || []).reduce((acc, i) => acc + i.quantity, 0)}</span>
                </div>
                <div className="food-receipt-row food-receipt-row--grand">
                  <span>GRAND TOTAL:</span>
                  <span>₹{Number(selectedBillSale.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="food-receipt-row food-receipt-row--pay">
                  <span>Payment Mode:</span>
                  <span>{selectedBillSale.paymentMethod === 'cash' ? 'PAID VIA CASH 💵' : 'PAID VIA UPI 📱'}</span>
                </div>
              </div>

              <div className="food-receipt-divider" />

              <div className="food-receipt-footer">
                <div>🎮 Game Hard · Eat Good 🍔</div>
                <div>Thank you for visiting TS Gaming Café!</div>
                <div style={{ fontSize: '0.68rem', marginTop: 4, color: '#666' }}>*** End of Receipt ***</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: EDIT BILL / SALE RECORD
          ═══════════════════════════════════════════════════════════════════ */}
      {editingSale && (
        <div className="modal-overlay" onClick={() => setEditingSale(null)}>
          <div
            className="modal-card admin-modal-card"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Edit Cafe Bill #{editingSale.id?.slice(0, 8)}
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    Modify customer info, payment mode, or item quantities
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditingSale(null)}
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditBill}>
              {/* Customer Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="admin-form-label">Customer Name</label>
                  <input
                    type="text"
                    value={editSaleForm.customerName}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, customerName: e.target.value })}
                    className="admin-form-input"
                    placeholder="Customer Name"
                  />
                </div>
                <div>
                  <label className="admin-form-label">Phone (WhatsApp)</label>
                  <input
                    type="tel"
                    value={editSaleForm.customerPhone}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, customerPhone: e.target.value })}
                    className="admin-form-input"
                    placeholder="10-digit Phone"
                  />
                </div>
              </div>

              {/* Station & Payment Method */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="admin-form-label">Table / Station</label>
                  <input
                    type="text"
                    value={editSaleForm.stationNumber}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, stationNumber: e.target.value })}
                    className="admin-form-input"
                    placeholder="e.g. PS5 #01, Table 2"
                  />
                </div>
                <div>
                  <label className="admin-form-label">Payment Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setEditSaleForm({ ...editSaleForm, paymentMethod: 'cash' })}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: `1.5px solid ${editSaleForm.paymentMethod === 'cash' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                        background: editSaleForm.paymentMethod === 'cash' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                        color: editSaleForm.paymentMethod === 'cash' ? '#4ade80' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSaleForm({ ...editSaleForm, paymentMethod: 'upi' })}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: `1.5px solid ${editSaleForm.paymentMethod === 'upi' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                        background: editSaleForm.paymentMethod === 'upi' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        color: editSaleForm.paymentMethod === 'upi' ? '#38bdf8' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      📱 UPI
                    </button>
                  </div>
                </div>
              </div>

              {/* Items in Bill */}
              <div style={{ marginBottom: '14px' }}>
                <label className="admin-form-label" style={{ marginBottom: '6px' }}>Items in this Bill</label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  {editSaleForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>{item.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#ff7700' }}>₹{item.price} each</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditBillItemQty(idx, -1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.1)',
                              border: 'none',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditBillItemQty(idx, 1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.1)',
                              border: 'none',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#fff', minWidth: '45px', textAlign: 'right' }}>
                          ₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Submit */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(255, 85, 0, 0.1)',
                borderRadius: '10px',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Updated Total:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ff5500' }}>
                  ₹{editSaleForm.items.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleDeleteBill(editingSale)}
                  style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={14} /> Delete Bill
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingSale(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  <Check size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
