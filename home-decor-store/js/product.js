// Product details and dimension pricing logic module
import { getSettings, getSocialLinks, getProductById, getCategories } from "./db.js";
import { renderHeader, renderFooter, showLoader, hideLoader, showToast } from "./ui.js";

// Page State variables
let storeSettings = {};
let currentProduct = null;
let currentCategory = null;
let activeUnit = "Feet";
let calculatedPrice = 0;
let requiresMeasurement = false;

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  try {
    // 1. Parse URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
      window.location.href = "./index.html";
      return;
    }

    // 2. Fetch records
    storeSettings = await getSettings();
    const socials = await getSocialLinks();
    currentProduct = await getProductById(productId);

    if (!currentProduct) {
      showToast("Selected product not found.", "error");
      setTimeout(() => { window.location.href = "./index.html"; }, 2000);
      return;
    }

    const categories = await getCategories(false);
    currentCategory = categories.find(c => c.id === currentProduct.categoryId);

    // 3. Render layouts
    renderHeader(storeSettings, "categories");
    renderFooter(storeSettings, socials);

    // 4. Determine measurement requirement
    const categoryName = currentCategory ? currentCategory.name : "Decor";
    requiresMeasurement = ["wallpaper", "door", "mat", "floor"].some(term => 
      categoryName.toLowerCase().includes(term)
    );

    // 5. Render details
    populateProductDetails(categoryName);
    setupDimensionCalculator();
    setupGalleryControls();

    // 6. Setup Checkout binders
    setupCheckoutActions();

  } catch (error) {
    console.error("Error displaying product details:", error);
    showToast("Error loading product. Displaying offline demo.", "error");
  } finally {
    hideLoader();
  }
});

// Render textual metadata & specs
function populateProductDetails(categoryName) {
  // Category path breadcrumb
  document.getElementById("detail-cat-name").textContent = categoryName;
  
  // Title
  document.getElementById("detail-prod-name").textContent = currentProduct.name;
  document.title = `${currentProduct.name} | Aura Luxury Decor`;

  // Description
  document.getElementById("detail-desc-text").textContent = currentProduct.description;

  // Prices display
  const pricePanel = document.getElementById("detail-price-panel");
  const basePrice = Number(currentProduct.discountPrice || currentProduct.originalPrice);
  
  const discountBadgeHtml = currentProduct.discountPercent > 0 
    ? `<div class="discount-badge">${currentProduct.discountPercent}% OFF</div>` 
    : "";

  const originalPriceHtml = currentProduct.discountPercent > 0 
    ? `<span class="original-price" style="margin-left:0">₹${Number(currentProduct.originalPrice).toLocaleString()}</span>` 
    : "";

  const measurementSuffix = requiresMeasurement ? " / Sq.Ft" : "";

  pricePanel.innerHTML = `
    <div style="display:flex; flex-direction:column; gap: 5px">
      <div style="display:flex; align-items:center; gap: 15px">
        <span class="discount-price" style="font-size:1.8rem">₹${basePrice.toLocaleString()}${measurementSuffix}</span>
        ${discountBadgeHtml}
      </div>
      ${originalPriceHtml ? `<div>${originalPriceHtml} <span style="font-size:0.8rem; color:#7D7262">(Original Price)</span></div>` : ""}
    </div>
  `;

  // Specifications list table
  const specsTable = document.getElementById("specs-table-root");
  if (currentProduct.specifications) {
    const lines = currentProduct.specifications.split("\n");
    const rowsHtml = lines.map(line => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        return `
          <tr>
            <th>${parts[0].trim()}</th>
            <td>${parts.slice(1).join(":").trim()}</td>
          </tr>
        `;
      }
      return "";
    }).join("");

    specsTable.innerHTML = rowsHtml;
  } else {
    specsTable.style.display = "none";
  }

  // Render Image Gallery
  const mainWrapper = document.getElementById("gallery-main-container");
  const thumbsWrapper = document.getElementById("gallery-thumbnails-container");
  
  const imagesList = currentProduct.images && currentProduct.images.length > 0
    ? currentProduct.images 
    : ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"];

  mainWrapper.innerHTML = `<img id="gallery-main-image" src="${imagesList[0]}" alt="${currentProduct.name}">`;

  if (imagesList.length > 1) {
    thumbsWrapper.innerHTML = imagesList.map((img, idx) => `
      <div class="thumbnail-item ${idx === 0 ? "active" : ""}" data-src="${img}">
        <img src="${img}" alt="${currentProduct.name} View ${idx + 1}">
      </div>
    `).join("");
  } else {
    thumbsWrapper.innerHTML = "";
  }
}

// Image switching thumbnail hover clicks
function setupGalleryControls() {
  const mainImg = document.getElementById("gallery-main-image");
  const thumbs = document.querySelectorAll(".thumbnail-item");

  thumbs.forEach(thumb => {
    thumb.addEventListener("click", () => {
      thumbs.forEach(t => t.classList.remove("active"));
      thumb.classList.add("active");
      
      const newSrc = thumb.getAttribute("data-src");
      mainImg.style.opacity = 0;
      setTimeout(() => {
        mainImg.src = newSrc;
        mainImg.style.opacity = 1;
      }, 150);
    });
  });
}

// Dimensions Calculator interface handling
function setupDimensionCalculator() {
  const calcSection = document.getElementById("dimensions-calc-section");
  if (!requiresMeasurement) {
    calcSection.style.display = "none";
    // Mobile sticky bar behavior - change text
    document.getElementById("mobile-buy-now-btn").innerHTML = `<i class="fas fa-shopping-bag"></i> Order Now`;
    return;
  }

  const widthInput = document.getElementById("dim-width");
  const heightInput = document.getElementById("dim-height");
  const unitButtons = document.querySelectorAll(".unit-btn");

  const calculateTotal = () => {
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const unitPrice = Number(currentProduct.discountPrice || currentProduct.originalPrice);

    let areaInSqFt = 0;

    if (activeUnit === "Feet") {
      areaInSqFt = width * height;
    } else if (activeUnit === "Inches") {
      areaInSqFt = (width / 12) * (height / 12);
    } else if (activeUnit === "Cm") {
      areaInSqFt = (width / 30.48) * (height / 30.48);
    }

    calculatedPrice = Math.max(0, Math.ceil(areaInSqFt * unitPrice));
    
    // Update labels
    document.getElementById("calc-preview-label").textContent = `Area: ${areaInSqFt.toFixed(2)} Sq.Ft x ₹${unitPrice.toLocaleString()}/Sq.Ft`;
    document.getElementById("calc-preview-price").textContent = `₹${calculatedPrice.toLocaleString()}`;
  };

  // Unit selector clicks
  unitButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      unitButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeUnit = btn.getAttribute("data-unit");
      calculateTotal();
    });
  });

  // Numeric inputs listeners
  widthInput.addEventListener("input", calculateTotal);
  heightInput.addEventListener("input", calculateTotal);

  // Initial pricing calculate run
  calculateTotal();
}

// Navigation redirects to checkout page
function setupCheckoutActions() {
  const buyBtn = document.getElementById("buy-now-btn");
  const mobileBuyBtn = document.getElementById("mobile-buy-now-btn");

  const processCheckout = () => {
    let url = `./checkout.html?productId=${currentProduct.id}`;

    if (requiresMeasurement) {
      const w = parseFloat(document.getElementById("dim-width").value) || 0;
      const h = parseFloat(document.getElementById("dim-height").value) || 0;

      if (w <= 0 || h <= 0) {
        showToast("Please enter valid width and height dimensions.", "error");
        return;
      }

      url += `&width=${w}&height=${h}&unit=${activeUnit}`;
    }

    window.location.href = url;
  };

  buyBtn.addEventListener("click", processCheckout);
  mobileBuyBtn.addEventListener("click", processCheckout);
}
