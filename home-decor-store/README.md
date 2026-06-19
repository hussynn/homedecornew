# Aura Luxury Decor - Home Decor Digital Store

A premium, luxury-styled, mobile-first digital showroom and order placement platform. Crafted with **HTML5**, **Vanilla CSS3**, and **Vanilla JavaScript (ES6 Modules)**, integrating **Firebase (Auth & Firestore)** and **Cloudinary** (direct client-side unsigned uploads).

---

## Features

1.  **Luxury Customer Experience**: Warm ivory, soft beige, and elegant gold design, responsive layouts, smooth swipeable sliders, and premium typography.
2.  **Custom Dimension Calculator**: Auto-calculates pricing per Square Foot for Wallpapers, Doors, and Floor Mats based on user-entered custom width, height, and unit selections (Feet, Inches, Centimeters).
3.  **Unified Checkout**: Customer details collection supporting Cash on Delivery (COD) or Instant UPI Payment with dynamic QR Code display, UPI ID copy, and payment deep links.
4.  **WhatsApp Order Integration**: Redirects customers to the owner's WhatsApp number with a beautifully formatted text receipt detailing customer details, selected products, custom sizes, total bill, and payment method.
5.  **Administrative Control Panel**:
    *   **Dashboard Summary**: Overview of recent orders, active inventory stats, and revenue metrics.
    *   **Category Management**: Add, update, delete category collections, display orders, and pictures.
    *   **Product Catalog Manager**: Add/edit items, manage pricing rates, specs, category relations, and multiple photos.
    *   **Banner Hero Slides Manager**: Manage homepage sliders, captions, and links.
    *   **Unified Store Settings**: Edit store profile, map locations, contact details, social links, and API credentials.
6.  **Offline Demo Fallback**: Works out of the box! If Firebase credentials are not configured, the app falls back to a LocalStorage-backed database, enabling full customer shopping flows and admin dashboard CRUD validation instantly.

---

## Project Structure

*   `index.html` — Customer Storefront Homepage
*   `product.html` — Product details, image gallery, specs, size pricing
*   `checkout.html` — Customer address form, UPI QR details, order submitter
*   `success.html` — Confirmation details and WhatsApp message compiler
*   `css/style.css` — Core Client UI Style System
*   `css/admin.css` — Admin UI Panels layout stylesheet
*   `js/`
    *   `firebase-config.js` — Firebase SDK config & connection checks
    *   `db.js` — Firestore database CRUD operations & demo fallbacks
    *   `auth.js` — Firebase Authentication & session guard clauses
    *   `cloudinary.js` — Direct Cloudinary API unsigned upload helper
    *   `ui.js` — Reusable elements (Headers, Footers, Loaders, Toasts)
    *   `app.js` — Homepage controller
    *   `product.js` — Size pricing calculations & details layout controller
    *   `checkout.js` — Form validator, UPI QR drawer, and submit controller
    *   `success.js` — Receipt display & WhatsApp compiler controller
    *   `admin.js` — Admin panel router, sidebar renderer, stats counts, order table
    *   `admin-categories.js` — Category CRUD modal handlers
    *   `admin-products.js` — Product CRUD and multi-image uploads
    *   `admin-slides.js` — Promo banners slider CRUD
    *   `admin-settings.js` — Config forms for profiles, UPIs, socials, and APIs
*   `admin/`
    *   `login.html` — Admin auth login card
    *   `index.html` — Admin orders manager dashboard
    *   `categories.html` — Category lists & edit dialogs
    *   `products.html` — Product lists & multi-file upload dialogs
    *   `slides.html` — Banner lists & upload dialogs
    *   `settings.html` — Multi-tab settings control panels
*   `vercel.json` — Static routing and redirection config

---

## Configuration & Setup

Aura Decor is designed to be completely configurable from the UI without changing code.

### Step 1: Firebase Project Setup
1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  Enable **Firebase Authentication** and choose **Email/Password** as the sign-in provider. Create an administrator user (e.g., `owner@auradecor.com` with a secure password).
3.  Enable **Cloud Firestore** in production mode.
4.  Add a **Web App** to your Firebase project and copy the configuration credentials (`apiKey`, `authDomain`, `projectId`, etc.).
5.  Set up **Firestore Database Rules** to allow public reads and restrict writes to authenticated admins:
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow anyone to read store content
        match /settings/{doc} { allow read: if true; allow write: if request.auth != null; }
        match /socialLinks/{doc} { allow read: if true; allow write: if request.auth != null; }
        match /categories/{doc} { allow read: if true; allow write: if request.auth != null; }
        match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
        match /heroSlides/{doc} { allow read: if true; allow write: if request.auth != null; }
        match /admins/{doc} { allow read: if true; allow write: if request.auth != null; }
        
        // Anyone can create an order; only admins can list, update, or delete
        match /orders/{doc} {
          allow create: if true;
          allow read, update, delete: if request.auth != null;
        }
      }
    }
    ```

### Step 2: Cloudinary Account Setup
To allow photo uploads directly from your browser:
1.  Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2.  Obtain your **Cloud Name** from the dashboard.
3.  Go to **Settings** (gear icon) > **Upload** tab.
4.  Scroll down to **Upload presets** and click **Add upload preset**.
5.  Set **Signing Mode** to **Unsigned**. Select folder paths if desired. Click Save and note the generated **Preset Name**.

### Step 3: Connect Services in Admin Panel
1.  Open the application in your browser (e.g. run a local live-server).
2.  Navigate to the Admin Login page: `/admin/login.html`.
3.  Log in using the Offline Demo credentials:
    *   **Email**: `admin@auradecor.com`
    *   **Password**: `adminpassword`
4.  Go to the **Store Settings** tab on the sidebar.
5.  Select the **API Credentials** sub-tab.
6.  Input your **Firebase Web SDK credentials** and **Cloudinary credentials** (Cloud Name and Unsigned Upload Preset Name).
7.  Click **Save Credentials & Reconnect**. The application will instantly save your credentials in secure localStorage, restart, connect to your real Firebase project, and prompt you to log in with your actual Firebase Auth admin credentials.
8.  Once connected, you can manage categories, products, slides, store profile parameters, UPI QR images, and WhatsApp links directly from the interface, and all updates will be written to your real database!

---

## Local Development & Deployment

### Testing Locally
Since the application uses Vanilla ES6 modules, it needs to be served by a web server.
You can run it using standard tools:
*   Using Python:
    ```bash
    python -m http.server 8000
    ```
*   Using Node `http-server` or `serve` package:
    ```bash
    npx http-server ./
    ```
*   Using VS Code: Click **Go Live** on Live Server extension.

### Deploying to Vercel
Deploying to Vercel is instantaneous. Run:
```bash
npx vercel
```
Or connect your GitHub repository to Vercel for automated deployments.
