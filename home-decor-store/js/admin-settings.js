// Admin Settings Management Page Controller
import { requireAdmin } from "./auth.js";
import { renderAdminSidebar, initMobileMenu } from "./admin.js";
import { getSettings, updateSettings, getSocialLinks, updateSocialLinks } from "./db.js";
import { uploadImage, getCloudinarySettings, saveCloudinarySettings } from "./cloudinary.js";
import { saveFirebaseConfig } from "./firebase-config.js";
import { showLoader, hideLoader, showToast } from "./ui.js";

// Global administrative settings state
let storeSettings = {};
let socialLinks = {};

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin(async (user) => {
    renderAdminSidebar("settings");
    initMobileMenu();
    await loadSettingsData();
    setupEventHandlers();
  });
});

async function loadSettingsData() {
  showLoader();
  try {
    storeSettings = await getSettings();
    socialLinks = await getSocialLinks();

    // 1. Populate Store Profile form
    document.getElementById("set-store-name").value = storeSettings.storeName || "";
    document.getElementById("set-store-phone").value = storeSettings.phone || "";
    document.getElementById("set-store-email").value = storeSettings.email || "";
    document.getElementById("set-store-address").value = storeSettings.address || "";
    document.getElementById("set-store-map-url").value = storeSettings.mapEmbedUrl || "";
    
    if (storeSettings.logoUrl) {
      document.getElementById("set-logo-url").value = storeSettings.logoUrl;
      document.getElementById("set-logo-preview-img").src = storeSettings.logoUrl;
      document.getElementById("set-logo-preview-container").style.display = "block";
    } else {
      document.getElementById("set-logo-url").value = "";
      document.getElementById("set-logo-preview-container").style.display = "none";
    }

    // 2. Populate Payment & UPI Form
    document.getElementById("set-upi-id").value = storeSettings.upiId || "";
    if (storeSettings.qrImage) {
      document.getElementById("set-qr-url").value = storeSettings.qrImage;
      document.getElementById("set-qr-preview-img").src = storeSettings.qrImage;
      document.getElementById("set-qr-preview-container").style.display = "block";
    }

    // 3. Populate Social Links Form
    document.getElementById("set-fb-url").value = socialLinks.facebook || "";
    document.getElementById("set-ig-url").value = socialLinks.instagram || "";
    document.getElementById("set-yt-url").value = socialLinks.youtube || "";
    document.getElementById("set-wa-num").value = socialLinks.whatsapp || "";

    // 4. Populate API Credentials Form (from localStorage config wrappers)
    populateApiCredentials();

  } catch (error) {
    console.error("Settings load failed:", error);
    showToast("Error retrieving configuration profiles.", "error");
  } finally {
    hideLoader();
  }
}

// Read and populate API credentials from storage
function populateApiCredentials() {
  // Cloudinary
  const cld = getCloudinarySettings();
  document.getElementById("cloudinary-cloud-name").value = cld.cloudName;
  document.getElementById("cloudinary-preset").value = cld.uploadPreset;

  // Firebase
  const savedFirebase = localStorage.getItem("AURA_DECOR_FIREBASE_CONFIG");
  if (savedFirebase) {
    try {
      const fb = JSON.parse(savedFirebase);
      document.getElementById("firebase-api-key").value = fb.apiKey || "";
      document.getElementById("firebase-auth-domain").value = fb.authDomain || "";
      document.getElementById("firebase-project-id").value = fb.projectId || "";
      document.getElementById("firebase-storage-bucket").value = fb.storageBucket || "";
      document.getElementById("firebase-sender-id").value = fb.messagingSenderId || "";
      document.getElementById("firebase-app-id").value = fb.appId || "";
    } catch (e) {
      console.error(e);
    }
  }
}

// Tabs navigation buttons click events
function setupTabNavigation() {
  const tabs = document.querySelectorAll(".settings-tab-btn");
  const panes = document.querySelectorAll(".settings-pane");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPaneId = `pane-${tab.getAttribute("data-pane")}`;
      document.getElementById(targetPaneId).classList.add("active");
    });
  });
}

// Bind Submit Actions
function setupEventHandlers() {
  setupTabNavigation();

  // Form 1: Store Profile submit
  document.getElementById("form-store-profile").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader();
    try {
      const data = {
        storeName: document.getElementById("set-store-name").value.trim(),
        phone: document.getElementById("set-store-phone").value.trim(),
        email: document.getElementById("set-store-email").value.trim(),
        address: document.getElementById("set-store-address").value.trim(),
        mapEmbedUrl: document.getElementById("set-store-map-url").value.trim(),
        logoUrl: document.getElementById("set-logo-url").value
      };

      await updateSettings(data);
      showToast("Store profile updated successfully.", "success");
    } catch (err) {
      showToast("Failed to save profile.", "error");
    } finally {
      hideLoader();
    }
  });

  // Form 2: Payment & UPI submit
  document.getElementById("form-payment-upi").addEventListener("submit", async (e) => {
    e.preventDefault();
    const qrUrl = document.getElementById("set-qr-url").value;

    if (!qrUrl) {
      showToast("Please upload a payment QR code image first.", "error");
      return;
    }

    showLoader();
    try {
      const data = {
        upiId: document.getElementById("set-upi-id").value.trim(),
        qrImage: qrUrl
      };

      await updateSettings(data);
      showToast("UPI configuration saved successfully.", "success");
    } catch (err) {
      showToast("Failed to save payment settings.", "error");
    } finally {
      hideLoader();
    }
  });

  // Form 3: Social Links submit
  document.getElementById("form-social-channels").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader();
    try {
      const data = {
        facebook: document.getElementById("set-fb-url").value.trim(),
        instagram: document.getElementById("set-ig-url").value.trim(),
        youtube: document.getElementById("set-yt-url").value.trim(),
        whatsapp: document.getElementById("set-wa-num").value.trim()
      };

      await updateSocialLinks(data);
      showToast("Social channel links saved successfully.", "success");
    } catch (err) {
      showToast("Failed to save social channels.", "error");
    } finally {
      hideLoader();
    }
  });

  // Form 4: Developer Credentials submit
  document.getElementById("form-dev-integrations").addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Cloudinary values
    const cldCloud = document.getElementById("cloudinary-cloud-name").value.trim();
    const cldPreset = document.getElementById("cloudinary-preset").value.trim();
    
    // Firebase values
    const fbKey = document.getElementById("firebase-api-key").value.trim();
    const fbDomain = document.getElementById("firebase-auth-domain").value.trim();
    const fbProject = document.getElementById("firebase-project-id").value.trim();
    const fbBucket = document.getElementById("firebase-storage-bucket").value.trim();
    const fbSender = document.getElementById("firebase-sender-id").value.trim();
    const fbApp = document.getElementById("firebase-app-id").value.trim();

    // Check Cloudinary inputs
    if (cldCloud && cldPreset) {
      saveCloudinarySettings(cldCloud, cldPreset);
    }

    // Check Firebase inputs
    if (fbKey && fbProject) {
      const config = {
        apiKey: fbKey,
        authDomain: fbDomain,
        projectId: fbProject,
        storageBucket: fbBucket,
        messagingSenderId: fbSender,
        appId: fbApp
      };
      saveFirebaseConfig(config);
    }

    showToast("API Credentials saved. Reconnecting services...", "success");
    
    setTimeout(() => {
      // Reload page to reinitialize connections
      window.location.reload();
    }, 1500);
  });

  // QR image selector listener
  const qrInput = document.getElementById("set-qr-file");
  qrInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size exceeds 2MB limit.", "error");
      qrInput.value = "";
      return;
    }

    showLoader();
    try {
      showToast("Uploading QR code to Cloudinary...", "info");
      const secureUrl = await uploadImage(file);

      document.getElementById("set-qr-url").value = secureUrl;
      document.getElementById("set-qr-preview-img").src = secureUrl;
      document.getElementById("set-qr-preview-container").style.display = "block";
      showToast("QR code image uploaded!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload QR code image.", "error");
    } finally {
      hideLoader();
    }
  });

  // Remove QR image preview trigger
  document.getElementById("remove-qr-img-btn").addEventListener("click", () => {
    document.getElementById("set-qr-url").value = "";
    document.getElementById("set-qr-preview-img").src = "";
    document.getElementById("set-qr-preview-container").style.display = "none";
    document.getElementById("set-qr-file").value = "";
  });

  // Logo image selector listener
  const logoInput = document.getElementById("set-logo-file");
  logoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size exceeds 2MB limit.", "error");
      logoInput.value = "";
      return;
    }

    showLoader();
    try {
      showToast("Uploading logo to Cloudinary...", "info");
      const secureUrl = await uploadImage(file);

      document.getElementById("set-logo-url").value = secureUrl;
      document.getElementById("set-logo-preview-img").src = secureUrl;
      document.getElementById("set-logo-preview-container").style.display = "block";
      showToast("Logo image uploaded!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload logo image.", "error");
    } finally {
      hideLoader();
    }
  });

  // Remove logo preview trigger
  document.getElementById("remove-logo-btn").addEventListener("click", () => {
    document.getElementById("set-logo-url").value = "";
    document.getElementById("set-logo-preview-img").src = "";
    document.getElementById("set-logo-preview-container").style.display = "none";
    document.getElementById("set-logo-file").value = "";
  });
}
