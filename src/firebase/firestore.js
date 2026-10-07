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

// ─── HELPERS ─────────────────────────────────────────────────
export const tsToDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};

export const toFirestoreTimestamp = (date) => Timestamp.fromDate(date instanceof Date ? date : new Date(date));
