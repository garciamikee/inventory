// ── Firebase project settings ──────────────────────────────────────────────
// Fill this in with YOUR Firebase project's values (Firebase Console →
// Project settings → General → "Your apps" → Web app → SDK setup and
// configuration → Config). This is safe to commit / expose publicly —
// it is not a secret. Access is controlled by Firestore Security Rules
// and by the email-domain check below, not by hiding this file.
// See README.md for full step-by-step setup.

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDU6Gv2Rha8gupI2cXrIlIWKieSc311eH4",
  authDomain: "wan-inventory.firebaseapp.com",
  projectId: "wan-inventory",
  storageBucket: "wan-inventory.firebasestorage.app",
  messagingSenderId: "410139145547",
  appId: "1:410139145547:web:685c6ca45a13d09f3464ce"
};

// Only Google accounts on this email domain may sign in and use the system
// (enforced both here and, more importantly, inside firestore.rules).
// Set to "" to allow any Google account (not recommended).
window.ALLOWED_EMAIL_DOMAIN = "1wan.ph";
