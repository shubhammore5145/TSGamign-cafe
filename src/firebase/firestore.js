import { db } from '../firebase/config';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// ─── USERS ───────────────────────────────────────────────────
export const getUser = (uid) => getDoc(doc(db, 'users', uid));

export const updateUser = (uid, data) =>
  updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });

// ─── GAMING SETUPS ───────────────────────────────────────────
export const getSetups = () => getDocs(collection(db, 'gamingSetups'));

export const getSetup = (id) => getDoc(doc(db, 'gamingSetups', id));

export const addSetup = (data) =>
  addDoc(collection(db, 'gamingSetups'), { ...data, createdAt: serverTimestamp() });

export const updateSetup = (id, data) =>
  updateDoc(doc(db, 'gamingSetups', id), { ...data, updatedAt: serverTimestamp() });

export const deleteSetup = (id) => deleteDoc(doc(db, 'gamingSetups', id));

export const subscribeToSetups = (callback, onError) =>
  onSnapshot(
    query(collection(db, 'gamingSetups'), orderBy('setupNumber')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err) => { if (onError) onError(err); else console.error('subscribeToSetups error:', err); }
  );

// ─── BOOKINGS ────────────────────────────────────────────────
export const createBooking = (data) =>
  addDoc(collection(db, 'bookings'), {
    status: 'confirmed',
    ...data,
    createdAt: serverTimestamp(),
  });

export const getBooking = (id) => getDoc(doc(db, 'bookings', id));

export const updateBooking = (id, data) =>
  updateDoc(doc(db, 'bookings', id), { ...data, updatedAt: serverTimestamp() });

export const deleteBooking = (id) => deleteDoc(doc(db, 'bookings', id));

export const getUserBookings = (uid) =>
  getDocs(
    query(
      collection(db, 'bookings'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    )
  );

export const getAllBookings = (statusFilter = null) => {
  const q = statusFilter
    ? query(collection(db, 'bookings'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
    : query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
  return getDocs(q);
};

export const subscribeToUserBookings = (uid, callback) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('userId', '==', uid), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const subscribeToAllBookings = (callback) =>
  onSnapshot(
    query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100)),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// ─── SESSIONS ────────────────────────────────────────────────
export const createSession = (data) =>
  addDoc(collection(db, 'sessions'), {
    ...data,
    status: 'active',
    alerts: { tenMin: false, fiveMin: false },
    createdAt: serverTimestamp(),
  });

export const updateSession = (id, data) =>
  updateDoc(doc(db, 'sessions', id), { ...data, updatedAt: serverTimestamp() });

export const subscribeToActiveSession = (uid, callback) =>
  onSnapshot(
    query(
      collection(db, 'sessions'),
      where('userId', '==', uid),
      where('status', '==', 'active'),
      limit(1)
    ),
    (snap) => callback(snap.docs.length > 0 ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null)
  );

export const subscribeToAllActiveSessions = (callback) =>
  onSnapshot(
    query(collection(db, 'sessions'), where('status', 'in', ['active', 'paused'])),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const subscribeToAllSessions = (callback) =>
  onSnapshot(
    query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// ─── GAMES ───────────────────────────────────────────────────
export const getGames = () => getDocs(collection(db, 'games'));
export const addGame = (data) => addDoc(collection(db, 'games'), { ...data, createdAt: serverTimestamp() });
export const updateGame = (id, data) => updateDoc(doc(db, 'games', id), data);
export const deleteGame = (id) => deleteDoc(doc(db, 'games', id));

// ─── TOURNAMENTS ─────────────────────────────────────────────
export const getTournaments = () =>
  getDocs(query(collection(db, 'tournaments'), orderBy('date', 'asc')));

export const getTournament = (id) => getDoc(doc(db, 'tournaments', id));

export const addTournament = (data) =>
  addDoc(collection(db, 'tournaments'), { ...data, createdAt: serverTimestamp() });

export const updateTournament = (id, data) =>
  updateDoc(doc(db, 'tournaments', id), data);

export const deleteTournament = (id) => deleteDoc(doc(db, 'tournaments', id));

export const registerForTournament = (data) =>
  addDoc(collection(db, 'tournamentRegistrations'), {
    ...data,
    status: 'registered',
    registeredAt: serverTimestamp(),
  });

export const getTournamentRegistrations = (tournamentId) =>
  getDocs(query(collection(db, 'tournamentRegistrations'), where('tournamentId', '==', tournamentId)));

export const getUserTournamentReg = (uid, tournamentId) =>
  getDocs(query(
    collection(db, 'tournamentRegistrations'),
    where('userId', '==', uid),
    where('tournamentId', '==', tournamentId)
  ));

// ─── MEMBERSHIPS ─────────────────────────────────────────────
export const getMemberships = () => getDocs(collection(db, 'memberships'));

// ─── NOTIFICATIONS ───────────────────────────────────────────
export const subscribeToNotifications = (uid, callback) =>
  onSnapshot(
    query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const markNotificationRead = (id) =>
  updateDoc(doc(db, 'notifications', id), { read: true });

export const addNotification = (data) =>
  addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });

// ─── CAFE CONFIG ─────────────────────────────────────────────
export const getCafeConfig = () => getDoc(doc(db, 'cafeConfig', 'main'));

export const subscribeToCafeConfig = (callback) =>
  onSnapshot(doc(db, 'cafeConfig', 'main'), (snap) => callback(snap.exists() ? snap.data() : null));

// ─── STAFF MANAGEMENT ─────────────────────────────────────────
const DEFAULT_STAFF_SEED = [];

export const getStaffList = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'staff'), orderBy('name', 'asc')));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem('ts_staff_data', JSON.stringify(list));
      return list;
    }
  } catch (e) {
    console.warn('Firestore getStaffList fallback:', e.message);
  }
  const local = localStorage.getItem('ts_staff_data');
  if (local) {
    try { return JSON.parse(local); } catch (err) {}
  }
  return DEFAULT_STAFF_SEED;
};

export const addStaff = async (data) => {
  try {
    const ref = await addDoc(collection(db, 'staff'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    // Sync local
    const local = JSON.parse(localStorage.getItem('ts_staff_data') || JSON.stringify(DEFAULT_STAFF_SEED));
    local.push({ id: ref.id, ...data, createdAt: new Date().toISOString() });
    localStorage.setItem('ts_staff_data', JSON.stringify(local));
    return ref.id;
  } catch (e) {
    console.warn('Firestore addStaff fallback to local:', e.message);
    const local = JSON.parse(localStorage.getItem('ts_staff_data') || JSON.stringify(DEFAULT_STAFF_SEED));
    const newStaff = { id: 'staff-' + Date.now(), ...data, createdAt: new Date().toISOString() };
    local.push(newStaff);
    localStorage.setItem('ts_staff_data', JSON.stringify(local));
    return newStaff.id;
  }
};

export const updateStaff = async (id, data) => {
  try {
    await updateDoc(doc(db, 'staff', id), { ...data, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('Firestore updateStaff fallback to local:', e.message);
  }
  // Sync local
  const local = JSON.parse(localStorage.getItem('ts_staff_data') || JSON.stringify(DEFAULT_STAFF_SEED));
  const idx = local.findIndex(s => s.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data };
    localStorage.setItem('ts_staff_data', JSON.stringify(local));
  }
};

export const deleteStaff = async (id) => {
  try {
    await deleteDoc(doc(db, 'staff', id));
  } catch (e) {
    console.warn('Firestore deleteStaff fallback to local:', e.message);
  }
  // Sync local
  const local = JSON.parse(localStorage.getItem('ts_staff_data') || JSON.stringify(DEFAULT_STAFF_SEED));
  const filtered = local.filter(s => s.id !== id);
  localStorage.setItem('ts_staff_data', JSON.stringify(filtered));
};

export const subscribeToStaff = (callback, onError) => {
  try {
    return onSnapshot(
      query(collection(db, 'staff'), orderBy('name', 'asc')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          localStorage.setItem('ts_staff_data', JSON.stringify(list));
          callback(list);
        } else {
          const local = localStorage.getItem('ts_staff_data');
          if (local) {
            callback(JSON.parse(local));
          } else {
            localStorage.setItem('ts_staff_data', JSON.stringify(DEFAULT_STAFF_SEED));
            callback(DEFAULT_STAFF_SEED);
          }
        }
      },
      (err) => {
        console.warn('subscribeToStaff fallback to local:', err?.message);
        const local = localStorage.getItem('ts_staff_data');
        callback(local ? JSON.parse(local) : DEFAULT_STAFF_SEED);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    const local = localStorage.getItem('ts_staff_data');
    callback(local ? JSON.parse(local) : DEFAULT_STAFF_SEED);
    return () => {};
  }
};

// ─── FOOD & DRINKS INVENTORY ──────────────────────────────────
export const DEFAULT_FOOD_ITEMS = [
  {
    id: 'food-1',
    name: 'Pizza',
    category: 'Snacks',
    price: 149,
    stock: 25,
    unit: 'pcs',
    image: '/images/pizza.jpg',
    desc: 'Cheesy thin crust with herbs & toppings',
    isAvailable: true,
  },
  {
    id: 'food-2',
    name: 'Burger',
    category: 'Snacks',
    price: 79,
    stock: 30,
    unit: 'pcs',
    image: '/images/burger.jpg',
    desc: 'Crispy veggie patty with creamy mayo & lettuce',
    isAvailable: true,
  },
  {
    id: 'food-3',
    name: 'French Fries',
    category: 'Snacks',
    price: 69,
    stock: 40,
    unit: 'plates',
    image: '/images/french-fries.jpg',
    desc: 'Golden crispy salted & Peri-Peri fries',
    isAvailable: true,
  },
  {
    id: 'food-4',
    name: 'Vadapav',
    category: 'Snacks',
    price: 25,
    stock: 50,
    unit: 'pcs',
    image: '/images/vadapav.jpg',
    desc: 'Authentic Mumbai style hot vada pav with spicy chutney',
    isAvailable: true,
  },
  {
    id: 'food-5',
    name: 'Momos',
    category: 'Snacks',
    price: 89,
    stock: 35,
    unit: 'plates',
    image: '/images/momos.jpg',
    desc: 'Steamed hot momos with spicy red dip',
    isAvailable: true,
  },
  {
    id: 'food-6',
    name: 'Ice Cream',
    category: 'Desserts',
    price: 49,
    stock: 20,
    unit: 'cups',
    image: '/images/icecream.jpg',
    desc: 'Assorted rich and creamy cold scoops',
    isAvailable: true,
  },
  {
    id: 'food-7',
    name: 'Cold Drinks',
    category: 'Beverages',
    price: 35,
    stock: 60,
    unit: 'cans',
    image: '/images/cold-drinks.jpg',
    desc: 'Chilled soda cans & carbonated beverages',
    isAvailable: true,
  },
  {
    id: 'food-8',
    name: 'Mineral Water',
    category: 'Beverages',
    price: 20,
    stock: 48,
    unit: 'bottles',
    image: '/images/cold-drinks.jpg',
    desc: 'Chilled 1 Liter mineral water bottle',
    isAvailable: true,
  },
  {
    id: 'food-9',
    name: 'Hot Masala Maggi',
    category: 'Snacks',
    price: 45,
    stock: 30,
    unit: 'bowls',
    image: '/images/more-items.jpg',
    desc: 'Classic 2-minute steaming masala noodles',
    isAvailable: true,
  },
  {
    id: 'food-10',
    name: 'Tea / Coffee',
    category: 'Beverages',
    price: 25,
    stock: 50,
    unit: 'cups',
    image: '/images/more-items.jpg',
    desc: 'Hot aromatic filter coffee or special masala chai',
    isAvailable: true,
  },
];

export const getFoodItems = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'foodItems'), orderBy('name', 'asc')));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem('ts_food_data', JSON.stringify(list));
      return list;
    }
  } catch (e) {
    console.warn('Firestore getFoodItems fallback:', e.message);
  }
  const local = localStorage.getItem('ts_food_data');
  if (local) {
    try { return JSON.parse(local); } catch (err) {}
  }
  return DEFAULT_FOOD_ITEMS;
};

export const addFoodItem = async (data) => {
  try {
    const ref = await addDoc(collection(db, 'foodItems'), {
      ...data,
      stock: Number(data.stock) || 0,
      price: Number(data.price) || 0,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      createdAt: serverTimestamp(),
    });
    const local = JSON.parse(localStorage.getItem('ts_food_data') || JSON.stringify(DEFAULT_FOOD_ITEMS));
    local.push({ id: ref.id, ...data, stock: Number(data.stock) || 0, price: Number(data.price) || 0 });
    localStorage.setItem('ts_food_data', JSON.stringify(local));
    return ref.id;
  } catch (e) {
    console.warn('Firestore addFoodItem fallback to local:', e.message);
    const local = JSON.parse(localStorage.getItem('ts_food_data') || JSON.stringify(DEFAULT_FOOD_ITEMS));
    const newItem = { id: 'food-' + Date.now(), ...data, stock: Number(data.stock) || 0, price: Number(data.price) || 0 };
    local.push(newItem);
    localStorage.setItem('ts_food_data', JSON.stringify(local));
    return newItem.id;
  }
};

export const updateFoodItem = async (id, data) => {
  try {
    await updateDoc(doc(db, 'foodItems', id), {
      ...data,
      stock: data.stock !== undefined ? Number(data.stock) : undefined,
      price: data.price !== undefined ? Number(data.price) : undefined,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore updateFoodItem fallback to local:', e.message);
  }
  const local = JSON.parse(localStorage.getItem('ts_food_data') || JSON.stringify(DEFAULT_FOOD_ITEMS));
  const idx = local.findIndex(item => item.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data };
    localStorage.setItem('ts_food_data', JSON.stringify(local));
  }
};

export const deleteFoodItem = async (id) => {
  try {
    await deleteDoc(doc(db, 'foodItems', id));
  } catch (e) {
    console.warn('Firestore deleteFoodItem fallback to local:', e.message);
  }
  const local = JSON.parse(localStorage.getItem('ts_food_data') || JSON.stringify(DEFAULT_FOOD_ITEMS));
  const filtered = local.filter(item => item.id !== id);
  localStorage.setItem('ts_food_data', JSON.stringify(filtered));
};

export const updateFoodStock = async (id, newStock) => {
  const stockVal = Math.max(0, Number(newStock) || 0);
  await updateFoodItem(id, { stock: stockVal, isAvailable: stockVal > 0 });
};

export const subscribeToFoodItems = (callback, onError) => {
  try {
    return onSnapshot(
      query(collection(db, 'foodItems'), orderBy('name', 'asc')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          localStorage.setItem('ts_food_data', JSON.stringify(list));
          callback(list);
        } else {
          const local = localStorage.getItem('ts_food_data');
          if (local) {
            callback(JSON.parse(local));
          } else {
            localStorage.setItem('ts_food_data', JSON.stringify(DEFAULT_FOOD_ITEMS));
            callback(DEFAULT_FOOD_ITEMS);
          }
        }
      },
      (err) => {
        console.warn('subscribeToFoodItems fallback to local:', err?.message);
        const local = localStorage.getItem('ts_food_data');
        callback(local ? JSON.parse(local) : DEFAULT_FOOD_ITEMS);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    const local = localStorage.getItem('ts_food_data');
    callback(local ? JSON.parse(local) : DEFAULT_FOOD_ITEMS);
    return () => {};
  }
};

// Food Sales / Billing records
export const recordFoodSale = async (saleData) => {
  try {
    const ref = await addDoc(collection(db, 'foodSales'), {
      ...saleData,
      createdAt: serverTimestamp(),
    });
    // Deduct stock for each sold item
    if (Array.isArray(saleData.items)) {
      for (const item of saleData.items) {
        if (item.id && item.quantity) {
          const currentStock = Number(item.stock) || 0;
          await updateFoodStock(item.id, Math.max(0, currentStock - item.quantity));
        }
      }
    }
    return ref.id;
  } catch (e) {
    console.warn('recordFoodSale fallback to local:', e.message);
    const localSales = JSON.parse(localStorage.getItem('ts_food_sales') || '[]');
    const newSale = { id: 'sale-' + Date.now(), ...saleData, createdAt: new Date().toISOString() };
    localSales.unshift(newSale);
    localStorage.setItem('ts_food_sales', JSON.stringify(localSales));
    return newSale.id;
  }
};

export const subscribeToFoodSales = (callback) => {
  try {
    return onSnapshot(
      query(collection(db, 'foodSales'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        localStorage.setItem('ts_food_sales', JSON.stringify(list));
        callback(list);
      },
      () => {
        const local = localStorage.getItem('ts_food_sales');
        callback(local ? JSON.parse(local) : []);
      }
    );
  } catch (err) {
    const local = localStorage.getItem('ts_food_sales');
    callback(local ? JSON.parse(local) : []);
    return () => {};
  }
};

// ─── HELPERS ─────────────────────────────────────────────────
export const tsToDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};

export const toFirestoreTimestamp = (date) => Timestamp.fromDate(date instanceof Date ? date : new Date(date));

