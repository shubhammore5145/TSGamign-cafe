# TS Gaming Café — Platform Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Configure Firebase

**Step A — Create a Firebase Project:**
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add Project" → name it "ts-gaming-cafe"
3. Enable Google Analytics (optional)

**Step B — Enable Firebase Services:**
- **Authentication**: Console → Authentication → Sign-in method → Enable **Email/Password**
- **Firestore**: Console → Firestore Database → Create database → **Production mode**
- **Storage**: Console → Storage → Get started → **Production mode**

**Step C — Add Web App & Get Config:**
1. Console → Project Settings → Your apps → Add app → Web (</>) 
2. Register your app → Copy the `firebaseConfig` object

**Step D — Update Config File:**
Open [`src/firebase/config.js`](./src/firebase/config.js) and replace the placeholder values:
```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Set Firestore Security Rules

Go to **Firebase Console → Firestore → Rules** and paste the contents of [`firestore.rules`](./firestore.rules).

### 4. Set Storage Rules

Go to **Firebase Console → Storage → Rules** and paste:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /setups/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /tournaments/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 5. Create First Admin Account

1. Start the app: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Register with your admin email (e.g., `admin@tsgamingcafe.in`)
4. Go to Firebase Console → Firestore → `users` collection
5. Find your user document → Click Edit → Add field:
   - Field: `role`, Type: `string`, Value: `admin`
6. Save → Now you can access `/admin`

### 6. Seed Initial Data (Recommended)

After setting up admin, go to `/admin/setups` and add your gaming setups. Recommended initial setups:

| # | Name | Type | Price | Specs |
|---|------|------|-------|-------|
| 01 | RTX Gaming PC | PC | ₹60 | RTX 4070, 16GB RAM, 144Hz |
| 02 | RTX Gaming PC | PC | ₹60 | RTX 4070, 16GB RAM, 144Hz |
| 03 | Pro Gaming PC | PC | ₹80 | RTX 4090, 32GB RAM, 240Hz |
| 04 | PS5 Console 1 | PS5 | ₹80 | PlayStation 5, 4K TV |
| 05 | PS5 Console 2 | PS5 | ₹80 | PlayStation 5, 4K TV |
| 06 | VR Station 1 | VR | ₹100 | Meta Quest 3 |
| 07 | Racing Sim 1 | Racing | ₹120 | Logitech G923, Full Cockpit |

### 7. Start Development Server
```bash
npm run dev
```

App will open at `http://localhost:3000`

### 8. Build for Production
```bash
npm run build
```

---

## 🏗️ Project Structure

```
ts-gaming-cafe/
├── src/
│   ├── firebase/
│   │   ├── config.js          ← Firebase config (ADD YOUR KEYS HERE)
│   │   ├── firestore.js       ← All Firestore helpers
│   │   └── storage.js         ← Firebase Storage helpers
│   ├── context/
│   │   ├── AuthContext.jsx    ← Firebase Auth state
│   │   └── ToastContext.jsx   ← Toast notifications
│   ├── hooks/
│   │   ├── useSessionTimer.js ← Firebase-timestamp-driven countdown
│   │   └── useSetups.js       ← Real-time setups listener
│   ├── components/
│   │   ├── Navbar.jsx/css     ← Top navigation
│   │   ├── Footer.jsx/css     ← Site footer
│   │   ├── ProtectedRoute.jsx ← Auth guard
│   │   ├── AdminRoute.jsx     ← Admin guard
│   │   └── LoadingSkeleton.jsx
│   └── pages/
│       ├── Home.jsx/css
│       ├── Setups.jsx/css
│       ├── Games.jsx/css
│       ├── Tournaments.jsx/css
│       ├── Membership.jsx/css
│       ├── Gallery.jsx/css
│       ├── Contact.jsx/css
│       ├── Auth.jsx/css
│       ├── Dashboard.jsx/css
│       ├── Booking.jsx/css
│       └── admin/
│           ├── AdminLogin.jsx
│           ├── AdminLayout.jsx
│           ├── AdminDashboard.jsx
│           ├── AdminSessions.jsx  ← Live session management
│           ├── AdminBookings.jsx
│           ├── AdminSetups.jsx
│           ├── AdminTournaments.jsx
│           └── AdminUsers.jsx
├── firestore.rules              ← Copy to Firebase Console
├── index.html
├── package.json
└── vite.config.js
```

---

## ⚡ Key Features

### Live Session Timer
- Timer reads `sessionEndTime` from Firestore — **not a local countdown**
- Survives browser refresh, logout, reconnect
- Formula: `remaining = sessionEndTime.toMillis() - Date.now()`
- Alerts fire exactly once at 10min and 5min

### Real-time Sync
- Setup status updates instantly across all clients
- Admin extends time → user's countdown updates live
- Session ends → setup flips to AVAILABLE automatically

### Admin Flow
1. Customer books → status: `pending`
2. Admin confirms → status: `confirmed`  
3. Admin clicks "Start" → session created in Firestore, setup flips to `occupied`, timer starts
4. Timer ends or admin ends → session `completed`, setup flips to `available`

---

## 🔐 Security Notes

- Firebase config keys are safe to expose in frontend (they're restricted by Firebase Security Rules)
- Never use Firebase Admin SDK in the frontend
- Security Rules in `firestore.rules` protect all user data
- Admin role is stored in Firestore, not Firebase Auth claims (simple approach)
- For production, consider Firebase Auth Custom Claims for more secure admin verification

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| 1280px+ | Full desktop |
| 1024px | Adjusted grid |
| 768px | Mobile nav, single-column |
| 480px | Compact mobile |
