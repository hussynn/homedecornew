// Dynamic Client UI Component Renderer Module

/**
 * Renders the primary navigation header in the target container
 * @param {Object} settings - Store settings configuration from Firestore
 * @param {string} activePage - Name of the active link to highlight (home, categories, contact)
 */
export function renderHeader(settings, activePage = "home") {
  const headerRoot = document.getElementById("header-root");
  if (!headerRoot) return;

  const storeName = settings.storeName || "Aura Decor";
  const logoImageHtml = settings.logoUrl 
    ? `<img src="${settings.logoUrl}" alt="${storeName}">` 
    : "";
  const logoTextHtml = `<div class="logo-text">${storeName.split(" ")[0]}<span>${storeName.split(" ").slice(1).join(" ") || "Decor"}</span></div>`;
  const logoContent = `${logoImageHtml}${logoTextHtml}`;

  headerRoot.innerHTML = `
    <div class="container">
      <div class="nav-container">
        <a href="./index.html" class="logo">
          ${logoContent}
        </a>
        <ul class="nav-menu">
          <li><a href="./index.html" class="nav-link ${activePage === "home" ? "active" : ""}">Home</a></li>
          <li><a href="./index.html#categories" class="nav-link ${activePage === "categories" ? "active" : ""}">Categories</a></li>
          <li><a href="./index.html#contact" class="nav-link ${activePage === "contact" ? "active" : ""}">Contact</a></li>
          <li><a href="./index.html#location" class="nav-link ${activePage === "location" ? "active" : ""}">Location</a></li>
        </ul>
        <button class="hamburger" id="hamburger-toggle" aria-label="Toggle Navigation">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>
    <div class="mobile-nav-drawer" id="mobile-nav-drawer">
      <a href="./index.html" class="nav-link ${activePage === "home" ? "active" : ""}">Home</a>
      <a href="./index.html#categories" class="nav-link ${activePage === "categories" ? "active" : ""}">Categories</a>
      <a href="./index.html#contact" class="nav-link ${activePage === "contact" ? "active" : ""}">Contact</a>
      <a href="./index.html#location" class="nav-link ${activePage === "location" ? "active" : ""}">Location</a>
    </div>
  `;

  // Hamburger menu toggle event handlers
  const hamburger = document.getElementById("hamburger-toggle");
  const drawer = document.getElementById("mobile-nav-drawer");

  if (hamburger && drawer) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("open");
      drawer.classList.toggle("open");
    });

    // Close drawer on link click
    const mobileLinks = drawer.querySelectorAll(".nav-link");
    mobileLinks.forEach(link => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("open");
        drawer.classList.remove("open");
      });
    });
  }
}

/**
 * Renders the site-wide footer inside the target container
 * @param {Object} settings - Store settings configuration
 * @param {Object} socials - Social links configuration
 */
export function renderFooter(settings, socials) {
  const footerRoot = document.getElementById("footer-root");
  if (!footerRoot) return;

  const storeName = settings.storeName || "Aura Decor";
  const address = settings.address || "";
  const phone = settings.phone || "";
  const email = settings.email || "";

  // Social Links Builder
  let socialIconsHtml = "";
  if (socials.facebook) {
    socialIconsHtml += `<a href="${socials.facebook}" target="_blank" class="social-link" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>`;
  }
  if (socials.instagram) {
    socialIconsHtml += `<a href="${socials.instagram}" target="_blank" class="social-link" aria-label="Instagram"><i class="fab fa-instagram"></i></a>`;
  }
  if (socials.youtube) {
    socialIconsHtml += `<a href="${socials.youtube}" target="_blank" class="social-link" aria-label="YouTube"><i class="fab fa-youtube"></i></a>`;
  }
  if (socials.whatsapp) {
    const waNumber = socials.whatsapp.replace(/[^0-9]/g, "");
    socialIconsHtml += `<a href="https://wa.me/${waNumber}" target="_blank" class="social-link" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
  }

  footerRoot.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col footer-about">
          <h3>About ${storeName}</h3>
          <p>We curate elegant, premium, and luxury home decor essentials designed to transform physical houses into beautiful aesthetic homes. Experience high-end wallpapers, artisanal doors, floor mats, and accessories.</p>
          <div class="social-links">
            ${socialIconsHtml || "Follow us on social media for updates."}
          </div>
        </div>
        <div class="footer-col">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="./index.html">Home</a></li>
            <li><a href="./index.html#categories">Categories</a></li>
            <li><a href="./index.html#contact">Contact Us</a></li>
            <li><a href="./index.html#location">Store Location</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h3>Contact Details</h3>
          <div class="footer-contact-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>${address}</span>
          </div>
          <div class="footer-contact-item">
            <i class="fas fa-phone-alt"></i>
            <span>${phone}</span>
          </div>
          <div class="footer-contact-item">
            <i class="fas fa-envelope"></i>
            <span>${email}</span>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${storeName}. All Rights Reserved. Crafted for premium living.</p>
        <p><a href="./admin/login.html" style="color: inherit; border-bottom: 1px dotted rgba(253,251,247,0.3)">Admin Portal</a></p>
      </div>
    </div>
  `;
}

/**
 * Creates or retrieves the global loading spinner and activates it
 */
export function showLoader() {
  let loader = document.getElementById("global-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "global-loader";
    loader.className = "loading-overlay";
    loader.innerHTML = `
      <div class="spinner"></div>
      <p style="font-weight:600; font-size:0.85rem; letter-spacing:1px; color:#C5A880; text-transform:uppercase;">Please Wait</p>
    `;
    document.body.appendChild(loader);
  }
  
  // Trigger layout compile
  loader.getBoundingClientRect();
  loader.classList.add("active");
}

/**
 * Deactivates the global loader spinner
 */
export function hideLoader() {
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.classList.remove("active");
  }
}

/**
 * Displays a non-blocking toast notification alert
 * @param {string} message - Notification text content
 * @param {string} type - Alert type: 'success' | 'error' | 'info'
 */
export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon selector
  let iconClass = "fas fa-info-circle";
  if (type === "success") iconClass = "fas fa-check-circle";
  if (type === "error") iconClass = "fas fa-exclamation-circle";

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 4000);
}
