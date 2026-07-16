// =====================================================
// FIREBASE CONFIGURATION
// =====================================================
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or use an existing one)
// 3. Add a Web App to the project
// 4. Copy the config object Firebase gives you and paste it below
// 5. Enable in the Firebase console:
//      - Firestore Database (start in production mode)
//      - Authentication → Sign-in method → Anonymous (enable)
//      - Authentication → Sign-in method → Email/Password (enable, for admin.html)
//
// This project uses only Firestore + Authentication — no Firebase
// Storage — so it runs entirely on the free Spark plan.
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// PASTE YOUR FIREBASE CONFIG HERE ↓↓↓
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
