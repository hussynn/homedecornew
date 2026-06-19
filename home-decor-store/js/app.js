// Homepage Logic and Component Orchestrator Module
import { 
  getSettings, 
  getSocialLinks, 
  getHeroSlides, 
  getCategories, 
  getProducts 
} from "./db.js";
import { 
  renderHeader, 
  renderFooter, 
  showLoader, 
  hideLoader, 
  showToast 
} from "./ui.js";

// Global controllers state
let storeSettings = {};
let allCategories = [];
let allProducts = [];
let activeCategoryFilter = "all";
let searchFilterQuery = "";
let heroSlides = [];

let sliderIndex = 0;
let sliderTimer = null;

// Initialize Homepage
document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  try {
    // 1. Fetch data from Firestore (or Demo Fallbacks)
    storeSettings = await getSettings();
    const socialLinks = await getSocialLinks();
    heroSlides = await getHeroSlides(true); // active slides only
    allCategories = await getCategories(true); // active categories only
    allProducts = await getProducts(null, true); // active products only

    // 2. Render Shared Layouts
    renderHeader(storeSettings, "home");
    renderFooter(storeSettings, socialLinks);

    // 3. Render Page Sections
    initHeroSlider();
    renderCategories();
    renderProductFilterDropdown();
    renderProducts();
    renderContactDetails();
    initLocationMap();

    // 4. Bind Interactions
    setupEventHandlers();

  } catch (error) {
    console.error("Initialization error:", error);
    showToast("Error loading page content. Running in demo mode.", "error");
  } finally {
    hideLoader();
  }
});

// Setup Hero Slider Carousel
function initHeroSlider() {
  const container = document.getElementById("hero-slider-container");
  const dotsContainer = document.getElementById("slider-dots-container");
  
  if (!container || !dotsContainer) return;

  if (heroSlides.length === 0) {
    // Hide hero section if no slides
    document.getElementById("hero-slider-section").style.display = "none";
    return;
  }

  // Generate slides content HTML
  container.innerHTML = heroSlides.map((slide, idx) => `
    <div class="hero-slide ${idx === 0 ? "active" : ""}" data-index="${idx}">
      <img src="${slide.imageUrl}" alt="${slide.title}">
      <div class="hero-content">
        <h1 class="hero-title">${slide.title}</h1>
        <p class="hero-subtitle">${slide.subtitle || ""}</p>
        <a href="#products" class="hero-btn">Explore Collection</a>
      </div>
    </div>
  `).join("");

  // Generate dots HTML
  dotsContainer.innerHTML = heroSlides.map((_, idx) => `
    <button class="slider-dot ${idx === 0 ? "active" : ""}" data-index="${idx}"></button>
  `).join("");

  // Slider actions
  setupSliderControls();
}

function setupSliderControls() {
  const slider = document.getElementById("hero-slider-container");
  const dots = document.querySelectorAll(".slider-dot");
  const slides = document.querySelectorAll(".hero-slide");

  if (!slider) return;

  const showSlide = (idx) => {
    // Boundaries
    if (idx >= heroSlides.length) sliderIndex = 0;
    else if (idx < 0) sliderIndex = heroSlides.length - 1;
    else sliderIndex = idx;

    // Slide position transform
    slider.style.transform = `translateX(-${sliderIndex * 100}%)`;

    // Toggle active markers
    slides.forEach((slide, sIdx) => {
      if (sIdx === sliderIndex) slide.classList.add("active");
      else slide.classList.remove("active");
    });

    dots.forEach((dot, dIdx) => {
      if (dIdx === sliderIndex) dot.classList.add("active");
      else dot.classList.remove("active");
    });
  };

  // Click Navigation dots
  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.getAttribute("data-index"));
      showSlide(idx);
      resetSliderTimer();
    });
  });

  // Next / Prev Arrows
  document.getElementById("slide-prev").addEventListener("click", () => {
    showSlide(sliderIndex - 1);
    resetSliderTimer();
  });

  document.getElementById("slide-next").addEventListener("click", () => {
    showSlide(sliderIndex + 1);
    resetSliderTimer();
  });

  // Auto Rotation loop
  const startSliderTimer = () => {
    sliderTimer = setInterval(() => {
      showSlide(sliderIndex + 1);
    }, 5000);
  };

  const resetSliderTimer = () => {
    clearInterval(sliderTimer);
    startSliderTimer();
  };

  startSliderTimer();

  // Mobile Swipe Support
  let startX = 0;
  let dist = 0;
  
  slider.addEventListener("touchstart", (e) => {
    startX = e.changedTouches[0].pageX;
  });

  slider.addEventListener("touchend", (e) => {
    dist = e.changedTouches[0].pageX - startX;
    if (Math.abs(dist) > 50) { // minimum distance threshold
      if (dist > 0) {
        showSlide(sliderIndex - 1); // swiped right
      } else {
        showSlide(sliderIndex + 1); // swiped left
      }
      resetSliderTimer();
    }
  });
}

// Render horizontal Categories scroll list
function renderCategories() {
  const root = document.getElementById("categories-root");
  if (!root) return;

  const defaultAllHtml = `
    <div class="category-card active" data-id="all">
      <div class="category-image-wrapper">
        <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=150" alt="All Collections">
      </div>
      <div class="category-name">All Collections</div>
    </div>
  `;

  const itemsHtml = allCategories.map(cat => `
    <div class="category-card" data-id="${cat.id}">
      <div class="category-image-wrapper">
        <img src="${cat.imageUrl}" alt="${cat.name}">
      </div>
      <div class="category-name">${cat.name}</div>
    </div>
  `).join("");

  root.innerHTML = defaultAllHtml + itemsHtml;

  // Add click handlers
  const cards = root.querySelectorAll(".category-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      
      const categoryId = card.getAttribute("data-id");
      filterByCategory(categoryId);
    });
  });
}

// Render options to matching products filter dropdown
function renderProductFilterDropdown() {
  const select = document.getElementById("category-filter");
  if (!select) return;

  const optionsHtml = allCategories.map(cat => `
    <option value="${cat.id}">${cat.name}</option>
  `).join("");

  select.innerHTML = `<option value="all">All Collections</option>` + optionsHtml;
}

// Render Products grid cards
function renderProducts() {
  const grid = document.getElementById("products-grid-root");
  if (!grid) return;

  // Apply filters
  let filtered = allProducts;

  if (activeCategoryFilter !== "all") {
    filtered = filtered.filter(p => p.categoryId === activeCategoryFilter);
  }

  if (searchFilterQuery.trim() !== "") {
    const queryStr = searchFilterQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(queryStr) || 
      p.description.toLowerCase().includes(queryStr)
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-products-message">
        <i class="fas fa-box-open"></i>
        <h3>No Products Found</h3>
        <p>Try searching with another keyword or selecting a different collection.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const coverImage = product.images?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500";
    const discountBadgeHtml = product.discountPercent > 0 
      ? `<div class="discount-badge">${product.discountPercent}% OFF</div>` 
      : "";

    const originalPriceHtml = product.discountPercent > 0 
      ? `<span class="original-price">₹${Number(product.originalPrice).toLocaleString()}</span>` 
      : "";

    const parentCategory = allCategories.find(c => c.id === product.categoryId);
    const categoryName = parentCategory ? parentCategory.name : "Decor Item";

    return `
      <a href="./product.html?id=${product.id}" class="product-card">
        <div class="product-card-image">
          ${discountBadgeHtml}
          <img src="${coverImage}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-card-content">
          <div class="product-card-category">${categoryName}</div>
          <h3 class="product-card-title">${product.name}</h3>
          <div class="product-card-price">
            <span class="discount-price">₹${Number(product.discountPrice || product.originalPrice).toLocaleString()}</span>
            ${originalPriceHtml}
          </div>
        </div>
      </a>
    `;
  }).join("");
}

// Triggered by category selection card clicks
function filterByCategory(categoryId) {
  activeCategoryFilter = categoryId;
  
  // Sync dropdown selector element
  const select = document.getElementById("category-filter");
  if (select) select.value = categoryId;

  // Refresh products list
  renderProducts();

  // Scroll smoothly to products grid
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
}

// Render Contact Details info blocks
function renderContactDetails() {
  const root = document.getElementById("contact-details-root");
  if (!root) return;

  const phone = storeSettings.phone || "+91 98765 43210";
  const email = storeSettings.email || "contact@decorstore.com";
  const address = storeSettings.address || "Main Street, City";

  root.innerHTML = `
    <h3>Get In Touch</h3>
    
    <div class="contact-item">
      <div class="contact-icon"><i class="fas fa-phone-alt"></i></div>
      <div class="contact-info-text">
        <h4>Phone Call / WhatsApp</h4>
        <p>${phone}</p>
      </div>
    </div>
    
    <div class="contact-item">
      <div class="contact-icon"><i class="fas fa-envelope"></i></div>
      <div class="contact-info-text">
        <h4>Email Address</h4>
        <p>${email}</p>
      </div>
    </div>
    
    <div class="contact-item">
      <div class="contact-icon"><i class="fas fa-map-marker-alt"></i></div>
      <div class="contact-info-text">
        <h4>Showroom Address</h4>
        <p>${address}</p>
      </div>
    </div>
    
    <div class="contact-item">
      <div class="contact-icon"><i class="fas fa-clock"></i></div>
      <div class="contact-info-text">
        <h4>Working Hours</h4>
        <p>Monday - Saturday: 10:00 AM - 8:30 PM\nSunday: Closed</p>
      </div>
    </div>
  `;
}

// Update Map frame source URL
function initLocationMap() {
  const mapFrame = document.getElementById("google-maps-frame");
  if (mapFrame && storeSettings.mapEmbedUrl) {
    mapFrame.src = storeSettings.mapEmbedUrl;
  }
}

// Connect other general layout listeners
function setupEventHandlers() {
  // Search typing event
  const searchInput = document.getElementById("product-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchFilterQuery = e.target.value;
      renderProducts();
    });
  }

  // Filter dropdown selector change
  const select = document.getElementById("category-filter");
  if (select) {
    select.addEventListener("change", (e) => {
      activeCategoryFilter = e.target.value;
      
      // Update top scrollbar active item highlight
      const categoryCards = document.querySelectorAll("#categories-root .category-card");
      categoryCards.forEach(card => {
        if (card.getAttribute("data-id") === activeCategoryFilter) {
          card.classList.add("active");
          card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        } else {
          card.classList.remove("active");
        }
      });

      renderProducts();
    });
  }
}
