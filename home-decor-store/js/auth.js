// Admin Authentication & Session Management Module
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, isFirebaseConfigured } from "./firebase-config.js";

// MOCK ADMIN CREDENTIALS FOR DEMO MODE
const MOCK_ADMIN = {
  email: "admin@auradecor.com",
  password: "adminpassword",
  uid: "demo_admin_uid",
  name: "Demo Admin Owner"
};

// Sign in Administrator
export async function signInAdmin(email, password) {
  if (!isFirebaseConfigured()) {
    // Demo mode authentication
    if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
      const userSession = {
        uid: MOCK_ADMIN.uid,
        email: MOCK_ADMIN.email,
        name: MOCK_ADMIN.name,
        role: "admin",
        isDemo: true
      };
      sessionStorage.setItem("AURA_DECOR_ADMIN_SESSION", JSON.stringify(userSession));
      return userSession;
    } else {
      throw new Error("Invalid administrator credentials in demo mode. Try email: 'admin@auradecor.com' and password: 'adminpassword'.");
    }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // User is logged in. We can query their role or just trust the admin login gate.
    return userCredential.user;
  } catch (error) {
    console.error("Firebase Signin Error:", error);
    let readableError = "Authentication failed. Please verify credentials.";
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      readableError = "Incorrect email address or password.";
    }
    throw new Error(readableError);
  }
}

// Sign out Administrator
export async function signOutAdmin() {
  if (!isFirebaseConfigured()) {
    sessionStorage.removeItem("AURA_DECOR_ADMIN_SESSION");
    return true;
  }
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Firebase Signout Error:", error);
    throw error;
  }
}

// Get current administrator state
export function getAdminUser() {
  if (!isFirebaseConfigured()) {
    const session = sessionStorage.getItem("AURA_DECOR_ADMIN_SESSION");
    return session ? JSON.parse(session) : null;
  }
  return auth ? auth.currentUser : null;
}

// Guard clause helper to check admin session on dashboard load
export function requireAdmin(callback) {
  if (!isFirebaseConfigured()) {
    const user = getAdminUser();
    if (user) {
      callback(user);
    } else {
      console.warn("Session check failed. Redirecting to login.");
      window.location.href = "./login.html";
    }
    return;
  }

  // Setup observer
  onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user);
    } else {
      console.warn("Auth check failed. Redirecting to login.");
      window.location.href = "./login.html";
    }
  });
}
