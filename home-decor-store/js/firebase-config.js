// Aura Decor Firebase SDK Loader & Initialization Module
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DEFAULT FIREBASE CONFIGURATION
// Replace these placeholders with your actual Firebase project settings
const defaultFirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Retrieve configuration. We check localStorage first so the admin can optionally
// configure the app dynamically without redeploying code.
let firebaseConfig = defaultFirebaseConfig;
const savedConfig = localStorage.getItem("AURA_DECOR_FIREBASE_CONFIG");

if (savedConfig) {
  try {
    firebaseConfig = JSON.parse(savedConfig);
  } catch (e) {
    console.error("Error parsing saved Firebase configuration:", e);
  }
}

// Helper to check if Firebase is configured
export function isFirebaseConfigured() {
  return firebaseConfig && 
         firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         firebaseConfig.projectId && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

let app;
let auth;
let db;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase config is empty or contains placeholder values. App is running in demo mode. Please set config values in js/firebase-config.js or via admin setup.");
}

// Function to save config updates (used by Admin settings page)
export function saveFirebaseConfig(newConfig) {
  if (newConfig && newConfig.apiKey && newConfig.projectId) {
    localStorage.setItem("AURA_DECOR_FIREBASE_CONFIG", JSON.stringify(newConfig));
    return true;
  }
  return false;
}

export function clearFirebaseConfig() {
  localStorage.removeItem("AURA_DECOR_FIREBASE_CONFIG");
}

export { app, auth, db };
