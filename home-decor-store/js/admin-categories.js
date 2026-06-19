// Admin Categories Management Page Controller
import { requireAdmin } from "./auth.js";
import { renderAdminSidebar, initMobileMenu } from "./admin.js";
import { getCategories, addCategory, updateCategory, deleteCategory } from "./db.js";
import { uploadImage } from "./cloudinary.js";
import { showLoader, hideLoader, showToast } from "./ui.js";

// Page state
let categories = [];

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin(async (user) => {
    renderAdminSidebar("categories");
    initMobileMenu();
    await loadCategories();
    setupEventHandlers();
  });
});

async function loadCategories() {
  showLoader();
  try {
    categories = await getCategories(false); // get active and inactive categories
    renderCategoriesTable();
  } catch (error) {
    console.error("Failed to load categories:", error);
    showToast("Error loading categories.", "error");
  } finally {
    hideLoader();
  }
}

// Render Table Rows
function renderCategoriesTable() {
  const tbody = document.getElementById("categories-table-body");
  if (!tbody) return;

  if (categories.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 40px; color:var(--text-gray);">
          No categories found. Click "Add New Category" to create one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = categories.map(cat => {
    const activeBadgeHtml = cat.active 
      ? `<span class="status-badge status-confirmed">Active</span>` 
      : `<span class="status-badge status-cancelled">Inactive</span>`;

    const imgUrl = cat.imageUrl || "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=100";

    return `
      <tr>
        <td>
          <img src="${imgUrl}" alt="${cat.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius:4px; border:1px solid var(--border-light);">
        </td>
        <td style="font-weight:600; color:var(--text-dark);">${cat.name}</td>
        <td style="font-weight:500;">${cat.displayOrder || 1}</td>
        <td>${activeBadgeHtml}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn action-btn-edit" data-id="${cat.id}" title="Edit Category">
              <i class="far fa-edit"></i>
            </button>
            <button class="action-btn action-btn-delete" data-id="${cat.id}" title="Delete Category">
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
      const catId = btn.getAttribute("data-id");
      openCategoryFormModal(catId);
    });
  });

  tbody.querySelectorAll(".action-btn-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const catId = btn.getAttribute("data-id");
      triggerCategoryDelete(catId);
    });
  });
}

// Open Form Modal (Add / Edit mode)
function openCategoryFormModal(categoryId = null) {
  const form = document.getElementById("category-form");
  const modalTitle = document.getElementById("modal-title");
  
  form.reset();
  document.getElementById("edit-category-id").value = "";
  document.getElementById("cat-image-url").value = "";
  document.getElementById("cat-image-preview-container").style.display = "none";
  document.getElementById("cat-preview-img").src = "";

  if (categoryId) {
    // Edit Mode
    modalTitle.textContent = "Edit Category";
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      document.getElementById("edit-category-id").value = cat.id;
      document.getElementById("cat-name").value = cat.name;
      document.getElementById("cat-order").value = cat.displayOrder;
      document.getElementById("cat-active").checked = cat.active;
      
      if (cat.imageUrl) {
        document.getElementById("cat-image-url").value = cat.imageUrl;
        document.getElementById("cat-preview-img").src = cat.imageUrl;
        document.getElementById("cat-image-preview-container").style.display = "block";
      }
    }
  } else {
    // Add Mode
    modalTitle.textContent = "Add Category";
    // Pre-fill next display order number
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.displayOrder || 0), 0);
    document.getElementById("cat-order").value = maxOrder + 1;
  }

  document.getElementById("category-modal").classList.add("active");
}

function closeCategoryModal() {
  document.getElementById("category-modal").classList.remove("active");
}

// Handle Form submits
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById("edit-category-id").value;
  const name = document.getElementById("cat-name").value.trim();
  const displayOrder = parseInt(document.getElementById("cat-order").value) || 1;
  const active = document.getElementById("cat-active").checked;
  const imageUrl = document.getElementById("cat-image-url").value;

  if (!imageUrl) {
    showToast("Please upload a category image first.", "error");
    return;
  }

  const categoryData = {
    name,
    displayOrder,
    active,
    imageUrl
  };

  showLoader();
  try {
    if (id) {
      await updateCategory(id, categoryData);
      showToast("Category updated successfully.", "success");
    } else {
      await addCategory(categoryData);
      showToast("Category created successfully.", "success");
    }
    
    closeCategoryModal();
    await loadCategories();
  } catch (error) {
    showToast("Failed to save category.", "error");
  } finally {
    hideLoader();
  }
}

// Delete Category record
async function triggerCategoryDelete(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return;

  const confirmation = confirm(`Are you sure you want to delete the category "${cat.name}"? All products associated with this category will remain, but the category itself will be removed.`);
  if (!confirmation) return;

  showLoader();
  try {
    await deleteCategory(categoryId);
    showToast("Category deleted successfully.", "success");
    await loadCategories();
  } catch (e) {
    showToast("Failed to delete category.", "error");
  } finally {
    hideLoader();
  }
}

// Bind Listeners
function setupEventHandlers() {
  document.getElementById("add-category-btn").addEventListener("click", () => openCategoryFormModal(null));
  document.getElementById("close-category-modal").addEventListener("click", closeCategoryModal);
  document.getElementById("close-modal-footer-btn").addEventListener("click", closeCategoryModal);
  document.getElementById("category-form").addEventListener("submit", handleFormSubmit);

  // File Upload listener
  const fileInput = document.getElementById("cat-image-file");
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size exceeds 2MB limit.", "error");
      fileInput.value = "";
      return;
    }

    showLoader();
    try {
      showToast("Uploading image to Cloudinary...", "info");
      const secureUrl = await uploadImage(file);
      
      document.getElementById("cat-image-url").value = secureUrl;
      document.getElementById("cat-preview-img").src = secureUrl;
      document.getElementById("cat-image-preview-container").style.display = "block";
      showToast("Image uploaded successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Failed to upload image.", "error");
    } finally {
      hideLoader();
    }
  });

  // Remove preview image listener
  document.getElementById("remove-cat-img-btn").addEventListener("click", () => {
    document.getElementById("cat-image-url").value = "";
    document.getElementById("cat-preview-img").src = "";
    document.getElementById("cat-image-preview-container").style.display = "none";
    document.getElementById("cat-image-file").value = "";
  });
}
