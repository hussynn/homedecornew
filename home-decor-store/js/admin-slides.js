// Admin Hero Slides Page Controller
import { requireAdmin } from "./auth.js";
import { renderAdminSidebar, initMobileMenu } from "./admin.js";
import { getHeroSlides, addHeroSlide, updateHeroSlide, deleteHeroSlide } from "./db.js";
import { uploadImage } from "./cloudinary.js";
import { showLoader, hideLoader, showToast } from "./ui.js";

// Page State variables
let slides = [];

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin(async (user) => {
    renderAdminSidebar("slides");
    initMobileMenu();
    await loadSlides();
    setupEventHandlers();
  });
});

async function loadSlides() {
  showLoader();
  try {
    slides = await getHeroSlides(false); // get active and inactive slides
    renderSlidesTable();
  } catch (error) {
    console.error("Hero slides load failed:", error);
    showToast("Error loading homepage slides.", "error");
  } finally {
    hideLoader();
  }
}

// Render Table Rows
function renderSlidesTable() {
  const tbody = document.getElementById("slides-table-body");
  if (!tbody) return;

  if (slides.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 40px; color:var(--text-gray);">
          No slides found. Click "Add New Slide" to create a homepage promo banner.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = slides.map(slide => {
    const activeBadgeHtml = slide.active 
      ? `<span class="status-badge status-confirmed">Active</span>` 
      : `<span class="status-badge status-cancelled">Inactive</span>`;

    const imgUrl = slide.imageUrl || "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=100";

    return `
      <tr>
        <td>
          <img src="${imgUrl}" alt="${slide.title}" style="width: 120px; height: 50px; object-fit: cover; border-radius:4px; border:1px solid var(--border-light);">
        </td>
        <td style="font-weight:600; color:var(--text-dark);">${slide.title}</td>
        <td style="font-size:0.85rem; color:var(--text-gray); max-width: 250px;">${slide.subtitle || "N/A"}</td>
        <td>${activeBadgeHtml}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn action-btn-edit" data-id="${slide.id}" title="Edit Slide">
              <i class="far fa-edit"></i>
            </button>
            <button class="action-btn action-btn-delete" data-id="${slide.id}" title="Delete Slide">
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
      const slideId = btn.getAttribute("data-id");
      openSlideFormModal(slideId);
    });
  });

  tbody.querySelectorAll(".action-btn-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const slideId = btn.getAttribute("data-id");
      triggerSlideDelete(slideId);
    });
  });
}

// Open Form Modal (Add / Edit mode)
function openSlideFormModal(slideId = null) {
  const form = document.getElementById("slide-form");
  const modalTitle = document.getElementById("modal-title");

  form.reset();
  document.getElementById("edit-slide-id").value = "";
  document.getElementById("slide-image-url").value = "";
  document.getElementById("slide-image-preview-container").style.display = "none";
  document.getElementById("slide-preview-img").src = "";

  if (slideId) {
    // Edit Mode
    modalTitle.textContent = "Edit Promo Slide";
    const slide = slides.find(s => s.id === slideId);
    if (slide) {
      document.getElementById("edit-slide-id").value = slide.id;
      document.getElementById("slide-title").value = slide.title;
      document.getElementById("slide-subtitle").value = slide.subtitle || "";
      document.getElementById("slide-active").checked = slide.active;
      
      if (slide.imageUrl) {
        document.getElementById("slide-image-url").value = slide.imageUrl;
        document.getElementById("slide-preview-img").src = slide.imageUrl;
        document.getElementById("slide-image-preview-container").style.display = "block";
      }
    }
  } else {
    // Add Mode
    modalTitle.textContent = "Add Promo Slide";
  }

  document.getElementById("slide-modal").classList.add("active");
}

function closeSlideModal() {
  document.getElementById("slide-modal").classList.remove("active");
}

// Handle Form submits
async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("edit-slide-id").value;
  const title = document.getElementById("slide-title").value.trim();
  const subtitle = document.getElementById("slide-subtitle").value.trim();
  const active = document.getElementById("slide-active").checked;
  const imageUrl = document.getElementById("slide-image-url").value;

  if (!imageUrl) {
    showToast("Please upload a banner background image first.", "error");
    return;
  }

  const slideData = {
    title,
    subtitle,
    active,
    imageUrl
  };

  showLoader();
  try {
    if (id) {
      await updateHeroSlide(id, slideData);
      showToast("Promo slide updated successfully.", "success");
    } else {
      await addHeroSlide(slideData);
      showToast("Promo slide created successfully.", "success");
    }

    closeSlideModal();
    await loadSlides();
  } catch (error) {
    showToast("Failed to save homepage slide banner.", "error");
  } finally {
    hideLoader();
  }
}

// Delete Slide banner record
async function triggerSlideDelete(slideId) {
  const slide = slides.find(s => s.id === slideId);
  if (!slide) return;

  const confirmation = confirm(`Are you sure you want to delete the slide banner "${slide.title}"?`);
  if (!confirmation) return;

  showLoader();
  try {
    await deleteHeroSlide(slideId);
    showToast("Promo slide deleted successfully.", "success");
    await loadSlides();
  } catch (e) {
    showToast("Failed to delete promo slide.", "error");
  } finally {
    hideLoader();
  }
}

// Bind event listeners
function setupEventHandlers() {
  document.getElementById("add-slide-btn").addEventListener("click", () => openSlideFormModal(null));
  document.getElementById("close-slide-modal").addEventListener("click", closeSlideModal);
  document.getElementById("close-modal-footer-btn").addEventListener("click", closeSlideModal);
  document.getElementById("slide-form").addEventListener("submit", handleFormSubmit);

  // File Upload listener
  const fileInput = document.getElementById("slide-image-file");
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
      showToast("Uploading banner to Cloudinary...", "info");
      const secureUrl = await uploadImage(file);

      document.getElementById("slide-image-url").value = secureUrl;
      document.getElementById("slide-preview-img").src = secureUrl;
      document.getElementById("slide-image-preview-container").style.display = "block";
      showToast("Banner background uploaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload banner background.", "error");
    } finally {
      hideLoader();
    }
  });

  // Remove preview image listener
  document.getElementById("remove-slide-img-btn").addEventListener("click", () => {
    document.getElementById("slide-image-url").value = "";
    document.getElementById("slide-preview-img").src = "";
    document.getElementById("slide-image-preview-container").style.display = "none";
    document.getElementById("slide-image-file").value = "";
  });
}
