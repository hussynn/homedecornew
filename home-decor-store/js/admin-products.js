// Admin Products Management Page Controller
import { requireAdmin } from "./auth.js";
import { renderAdminSidebar, initMobileMenu } from "./admin.js";
import { getCategories, getProducts, addProduct, updateProduct, deleteProduct } from "./db.js";
import { uploadImage } from "./cloudinary.js";
import { showLoader, hideLoader, showToast } from "./ui.js";

// Global administrative views lists
let products = [];
let categories = [];
let uploadedImages = []; // tracks image URLs for active form edit

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin(async (user) => {
    renderAdminSidebar("products");
    initMobileMenu();
    await loadProductsData();
    setupEventHandlers();
  });
});

async function loadProductsData() {
  showLoader();
  try {
    categories = await getCategories(false);
    products = await getProducts(null, false); // get active and inactive products

    populateCategorySelectors();
    renderProductsTable();
  } catch (error) {
    console.error("Products load failed:", error);
    showToast("Error retrieving inventory records.", "error");
  } finally {
    hideLoader();
  }
}

// Populate search filter select & add product select dropdowns
function populateCategorySelectors() {
  const filterSelect = document.getElementById("admin-category-filter");
  const formSelect = document.getElementById("prod-category");

  if (filterSelect) {
    const filterOptionsHtml = categories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join("");
    filterSelect.innerHTML = `<option value="all">All Categories</option>` + filterOptionsHtml;
  }

  if (formSelect) {
    formSelect.innerHTML = categories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join("");
  }
}

// Render inventory items table rows
function renderProductsTable() {
  const tbody = document.getElementById("products-table-body");
  if (!tbody) return;

  const searchQuery = document.getElementById("admin-search-input")?.value.toLowerCase() || "";
  const categoryFilter = document.getElementById("admin-category-filter")?.value || "all";

  // Filter local copy
  let filtered = products;

  if (categoryFilter !== "all") {
    filtered = filtered.filter(p => p.categoryId === categoryFilter);
  }

  if (searchQuery.trim() !== "") {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 40px; color:var(--text-gray);">
          No products found. Click "Add New Product" to create one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(prod => {
    const activeBadgeHtml = prod.active 
      ? `<span class="status-badge status-confirmed">Active</span>` 
      : `<span class="status-badge status-cancelled">Hidden</span>`;

    const imgUrl = prod.images?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100";
    const parentCategory = categories.find(c => c.id === prod.categoryId);
    const categoryName = parentCategory ? parentCategory.name : "Decor";

    return `
      <tr>
        <td>
          <img src="${imgUrl}" alt="${prod.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius:4px; border:1px solid var(--border-light);">
        </td>
        <td style="font-weight:600; color:var(--text-dark); max-width: 250px;">${prod.name}</td>
        <td style="font-weight:500;">${categoryName}</td>
        <td style="font-weight:500; color:var(--text-gray);">₹${Number(prod.originalPrice).toLocaleString()}</td>
        <td style="font-weight:700; color:var(--text-dark);">₹${Number(prod.discountPrice || prod.originalPrice).toLocaleString()}</td>
        <td style="font-weight:600; color:#2E7D32;">${prod.discountPercent || 0}%</td>
        <td>${activeBadgeHtml}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn action-btn-edit" data-id="${prod.id}" title="Edit Product">
              <i class="far fa-edit"></i>
            </button>
            <button class="action-btn action-btn-delete" data-id="${prod.id}" title="Delete Product">
              <i class="far fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Bind edit & delete listeners
  tbody.querySelectorAll(".action-btn-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const prodId = btn.getAttribute("data-id");
      openProductFormModal(prodId);
    });
  });

  tbody.querySelectorAll(".action-btn-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const prodId = btn.getAttribute("data-id");
      triggerProductDelete(prodId);
    });
  });
}

// Open Form Modal (Add / Edit mode)
function openProductFormModal(productId = null) {
  const form = document.getElementById("product-form");
  const modalTitle = document.getElementById("modal-title");
  
  form.reset();
  document.getElementById("edit-product-id").value = "";
  uploadedImages = [];
  renderFormImagesPreviews();

  if (productId) {
    // Edit Mode
    modalTitle.textContent = "Edit Product";
    const prod = products.find(p => p.id === productId);
    if (prod) {
      document.getElementById("edit-product-id").value = prod.id;
      document.getElementById("prod-name").value = prod.name;
      document.getElementById("prod-category").value = prod.categoryId;
      document.getElementById("prod-active").checked = prod.active;
      document.getElementById("prod-desc").value = prod.description;
      document.getElementById("prod-original-price").value = prod.originalPrice;
      document.getElementById("prod-discount-price").value = prod.discountPrice;
      document.getElementById("prod-specs").value = prod.specifications || "";
      
      uploadedImages = prod.images ? [...prod.images] : [];
      renderFormImagesPreviews();
    }
  } else {
    // Add Mode
    modalTitle.textContent = "Add Product";
  }

  document.getElementById("product-modal").classList.add("active");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("active");
}

// Render thumbnails preview inside Form dialog
function renderFormImagesPreviews() {
  const previewRoot = document.getElementById("prod-images-preview-root");
  document.getElementById("prod-images-json").value = JSON.stringify(uploadedImages);

  if (uploadedImages.length === 0) {
    previewRoot.innerHTML = "";
    return;
  }

  previewRoot.innerHTML = uploadedImages.map((imgUrl, idx) => `
    <div class="preview-thumb">
      <img src="${imgUrl}" alt="Product image preview ${idx + 1}">
      <button type="button" class="preview-remove-btn" data-index="${idx}">&times;</button>
      ${idx === 0 ? '<div style="position:absolute; bottom:0; left:0; width:100%; text-align:center; background:rgba(60,50,37,0.85); color:#FFF; font-size:0.65rem; padding:2px 0;">Cover</div>' : ''}
    </div>
  `).join("");

  // Bind thumbnail remove handlers
  previewRoot.querySelectorAll(".preview-remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"));
      uploadedImages.splice(idx, 1);
      renderFormImagesPreviews();
    });
  });
}

// Handle Form submits
async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("edit-product-id").value;
  const name = document.getElementById("prod-name").value.trim();
  const categoryId = document.getElementById("prod-category").value;
  const active = document.getElementById("prod-active").checked;
  const description = document.getElementById("prod-desc").value.trim();
  const originalPrice = parseFloat(document.getElementById("prod-original-price").value) || 0;
  const discountPrice = parseFloat(document.getElementById("prod-discount-price").value) || 0;
  const specifications = document.getElementById("prod-specs").value.trim();

  if (uploadedImages.length === 0) {
    showToast("Please upload at least one image for the product.", "error");
    return;
  }

  if (discountPrice > originalPrice) {
    showToast("Discount price cannot exceed original base price.", "error");
    return;
  }

  // Calculate discount percentage
  const discountPercent = originalPrice > 0 
    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) 
    : 0;

  const productData = {
    name,
    categoryId,
    description,
    originalPrice,
    discountPrice,
    discountPercent,
    specifications,
    active,
    images: uploadedImages
  };

  showLoader();
  try {
    if (id) {
      await updateProduct(id, productData);
      showToast("Product updated successfully.", "success");
    } else {
      await addProduct(productData);
      showToast("Product created successfully.", "success");
    }

    closeProductModal();
    await loadProductsData();
  } catch (error) {
    showToast("Failed to save product details.", "error");
  } finally {
    hideLoader();
  }
}

// Delete inventory item record
async function triggerProductDelete(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const confirmation = confirm(`Are you sure you want to delete "${prod.name}"? This item will be removed permanently from the store database.`);
  if (!confirmation) return;

  showLoader();
  try {
    await deleteProduct(productId);
    showToast("Product deleted successfully.", "success");
    await loadProductsData();
  } catch (e) {
    showToast("Failed to delete product record.", "error");
  } finally {
    hideLoader();
  }
}

// Connect filters & inputs listeners
function setupEventHandlers() {
  document.getElementById("add-product-btn").addEventListener("click", () => openProductFormModal(null));
  document.getElementById("close-product-modal").addEventListener("click", closeProductModal);
  document.getElementById("close-modal-footer-btn").addEventListener("click", closeProductModal);
  document.getElementById("product-form").addEventListener("submit", handleFormSubmit);

  // Search input typing listener
  document.getElementById("admin-search-input").addEventListener("input", renderProductsTable);
  
  // Category dropdown filter listener
  document.getElementById("admin-category-filter").addEventListener("change", renderProductsTable);

  // Multiple File uploads handlers
  const fileInput = document.getElementById("prod-image-files");
  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    showLoader();
    try {
      showToast(`Uploading ${files.length} images to Cloudinary...`, "info");
      
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) {
          showToast(`Skipping "${file.name}": exceeds 2MB limit.`, "warning");
          continue;
        }

        const secureUrl = await uploadImage(file);
        uploadedImages.push(secureUrl);
      }

      renderFormImagesPreviews();
      showToast("Image files uploaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Could not upload one or more image files.", "error");
    } finally {
      fileInput.value = "";
      hideLoader();
    }
  });
}
