// Admin Core Controller & Layout Orchestrator
import { requireAdmin, signOutAdmin } from "./auth.js";
import { getOrders, getProducts, getCategories, updateOrderStatus, deleteOrder } from "./db.js";
import { showLoader, hideLoader, showToast } from "./ui.js";

// Global administrative views configurations
let allOrders = [];

// Sidebar Injection Helper
export function renderAdminSidebar(activeItem) {
  const sidebarNav = document.getElementById("admin-sidebar-nav");
  if (!sidebarNav) return;

  sidebarNav.innerHTML = `
    <div class="sidebar-header">
      <i class="fas fa-gem" style="color:var(--accent-gold); font-size: 1.4rem;"></i>
      <h2>Aura Admin</h2>
    </div>
    <ul class="sidebar-menu">
      <li class="sidebar-item ${activeItem === "dashboard" ? "active" : ""}">
        <a href="./index.html"><i class="fas fa-chart-line"></i> Dashboard</a>
      </li>
      <li class="sidebar-item ${activeItem === "categories" ? "active" : ""}">
        <a href="./categories.html"><i class="fas fa-list"></i> Categories</a>
      </li>
      <li class="sidebar-item ${activeItem === "products" ? "active" : ""}">
        <a href="./products.html"><i class="fas fa-box"></i> Products</a>
      </li>
      <li class="sidebar-item ${activeItem === "slides" ? "active" : ""}">
        <a href="./slides.html"><i class="fas fa-images"></i> Hero Slider</a>
      </li>
      <li class="sidebar-item ${activeItem === "settings" ? "active" : ""}">
        <a href="./settings.html"><i class="fas fa-cog"></i> Store Settings</a>
      </li>
    </ul>
    <div class="sidebar-footer">
      <button class="logout-btn" id="logout-btn-trigger">
        <i class="fas fa-sign-out-alt"></i> Log Out
      </button>
    </div>
  `;

  // Bind Logout handler
  document.getElementById("logout-btn-trigger").addEventListener("click", async () => {
    showLoader();
    try {
      await signOutAdmin();
      showToast("Logged out successfully.", "success");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1000);
    } catch (e) {
      showToast("Logout failed.", "error");
    } finally {
      hideLoader();
    }
  });
}

// Setup Hamburger Drawer for Mobile
export function initMobileMenu() {
  const toggleBtn = document.getElementById("admin-hamburger-toggle");
  const sidebar = document.getElementById("admin-sidebar-nav");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });

    // Close sidebar on body click outside
    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
    });
  }
}

// --- DASHBOARD DATA HANDLERS ---
document.addEventListener("DOMContentLoaded", () => {
  // Guard clause checking admin authentication
  requireAdmin(async (user) => {
    // Populate user profile info
    const profileName = document.getElementById("admin-profile-name");
    const profileAvatar = document.getElementById("admin-profile-avatar");
    if (profileName) profileName.textContent = user.displayName || user.name || "Owner Admin";
    if (profileAvatar) profileAvatar.textContent = (user.displayName || user.name || "A")[0].toUpperCase();

    // Render shared components
    renderAdminSidebar("dashboard");
    initMobileMenu();

    // Run dashboard stats if elements exist on index.html
    if (document.getElementById("orders-table-body")) {
      await loadDashboardData();
    }
  });
});

async function loadDashboardData() {
  showLoader();
  try {
    // Fetch dashboard components
    allOrders = await getOrders();
    const productsList = await getProducts(null, false); // fetch active and inactive products
    const categoriesList = await getCategories(false); // fetch active and inactive categories

    // Update Stats indicators
    const ordersCount = allOrders.length;
    const productsCount = productsList.length;
    const categoriesCount = categoriesList.length;

    // Revenue calculation (count all non-cancelled orders)
    const totalRevenue = allOrders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    // Render Stats
    document.getElementById("stat-total-orders").textContent = ordersCount;
    document.getElementById("stat-total-products").textContent = productsCount;
    document.getElementById("stat-total-categories").textContent = categoriesCount;
    document.getElementById("stat-total-revenue").textContent = `₹${totalRevenue.toLocaleString()}`;

    // Render Orders
    renderOrdersTable("all");

    // Bind filters dropdown
    const filterSelect = document.getElementById("order-status-filter");
    filterSelect.addEventListener("change", (e) => {
      renderOrdersTable(e.target.value);
    });

    // Bind Modal Close button
    document.getElementById("close-order-modal").addEventListener("click", toggleDetailsModal);
    document.getElementById("close-modal-footer-btn").addEventListener("click", toggleDetailsModal);

  } catch (error) {
    console.error("Dashboard load failed:", error);
    showToast("Error retrieving store statistics.", "error");
  } finally {
    hideLoader();
  }
}

// Render recent orders table rows
function renderOrdersTable(filterStatus = "all") {
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) return;

  let filtered = allOrders;
  if (filterStatus !== "all") {
    filtered = allOrders.filter(o => o.status === filterStatus);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 40px; color:var(--text-gray);">
          No orders found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(order => {
    const sizeStr = order.width && order.height 
      ? `${order.width} x ${order.height} ${order.unit}` 
      : "Standard Size";

    const paymentMethodHtml = order.paymentMethod === "UPI" 
      ? `<i class="fab fa-google-pay" style="font-size:1.6rem; vertical-align:middle; color:#1565C0;"></i> UPI` 
      : `<i class="fas fa-money-bill-wave" style="color:#2E7D32;"></i> COD`;

    // Dropdown for Status Selector
    const statusSelectHtml = `
      <select class="status-selector filter-select" data-id="${order.id}" style="padding: 5px 10px; font-size:0.8rem; font-weight:600; border-radius:15px; border-color:var(--border-light); background-color: var(--primary-ivory);">
        <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
        <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Confirmed</option>
        <option value="shipped" ${order.status === "shipped" ? "selected" : ""}>Shipped</option>
        <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
      </select>
    `;

    return `
      <tr>
        <td style="font-weight:600; color:var(--accent-gold);">${order.orderId}</td>
        <td>
          <div style="font-weight:600;">${order.customerName}</div>
          <div style="font-size:0.75rem; color:var(--text-gray);">${order.phone}</div>
        </td>
        <td style="font-weight:500;">${order.productName}</td>
        <td style="font-size:0.85rem; color:var(--text-gray);">${sizeStr}</td>
        <td style="font-weight:700; color:var(--text-dark);">₹${Number(order.totalAmount).toLocaleString()}</td>
        <td>${paymentMethodHtml}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:5px">
            <span class="status-badge status-${order.status}">${order.status}</span>
            ${statusSelectHtml}
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn action-btn-view" data-id="${order.id}" title="View Shipping Details">
              <i class="far fa-eye"></i>
            </button>
            <button class="action-btn action-btn-delete" data-id="${order.id}" title="Delete Record">
              <i class="far fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Bind status selector change listeners
  tbody.querySelectorAll(".status-selector").forEach(selector => {
    selector.addEventListener("change", async (e) => {
      const orderId = selector.getAttribute("data-id");
      const newStatus = e.target.value;
      
      showLoader();
      try {
        await updateOrderStatus(orderId, newStatus);
        showToast("Order status updated successfully.", "success");
        
        // Sync local object state and reload indicators
        const idx = allOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) allOrders[idx].status = newStatus;
        
        // Refresh stats revenue counts and table views
        const totalRevenue = allOrders
          .filter(o => o.status !== "cancelled")
          .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        document.getElementById("stat-total-revenue").textContent = `₹${totalRevenue.toLocaleString()}`;
        
        renderOrdersTable(document.getElementById("order-status-filter").value);
      } catch (err) {
        showToast("Could not modify order status.", "error");
      } finally {
        hideLoader();
      }
    });
  });

  // Bind view details & delete buttons
  tbody.querySelectorAll(".action-btn-view").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-id");
      showOrderDetails(orderId);
    });
  });

  tbody.querySelectorAll(".action-btn-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-id");
      triggerOrderDelete(orderId);
    });
  });
}

// Display order details in popup modal
function showOrderDetails(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const modalBody = document.getElementById("order-details-modal-body");
  document.getElementById("modal-order-id").textContent = `Order Reference: ${order.orderId}`;

  const sizeText = order.width && order.height 
    ? `${order.width} x ${order.height} ${order.unit}` 
    : "Standard Size / Accent Item";

  const orderTime = order.createdAt 
    ? (order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt))
    : new Date();

  modalBody.innerHTML = `
    <div class="order-details-modal-grid">
      
      <div class="order-section-block">
        <h4>Customer Information</h4>
        <div class="order-grid-2">
          <div class="detail-label-val">
            <span class="detail-label">Name</span>
            <span class="detail-val">${order.customerName}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Phone Call / WhatsApp</span>
            <span class="detail-val">${order.phone}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Email Address</span>
            <span class="detail-val">${order.email || "N/A"}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Order Timestamp</span>
            <span class="detail-val">${orderTime.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div class="order-section-block">
        <h4>Shipping Details</h4>
        <div class="order-grid-2">
          <div class="detail-label-val" style="grid-column: 1 / -1">
            <span class="detail-label">Physical Delivery Address</span>
            <span class="detail-val" style="white-space:pre-wrap;">${order.address}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Postal PIN Code</span>
            <span class="detail-val">${order.pinCode}</span>
          </div>
        </div>
      </div>

      <div class="order-section-block">
        <h4>Product & Sizes Summary</h4>
        <div class="order-grid-2">
          <div class="detail-label-val">
            <span class="detail-label">Product Name</span>
            <span class="detail-val">${order.productName}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Dimensions / Area</span>
            <span class="detail-val">${sizeText}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Billing Method</span>
            <span class="detail-val">${order.paymentMethod}</span>
          </div>
          <div class="detail-label-val">
            <span class="detail-label">Total Paid/Payable</span>
            <span class="detail-val" style="font-weight:700; color:var(--accent-gold);">₹${Number(order.totalAmount).toLocaleString()}</span>
          </div>
        </div>
      </div>

    </div>
  `;

  toggleDetailsModal();
}

function toggleDetailsModal() {
  const modal = document.getElementById("order-details-modal");
  modal.classList.toggle("active");
}

// Delete order record prompt
async function triggerOrderDelete(orderId) {
  const confirmation = confirm("Are you sure you want to delete this order record? This action cannot be undone.");
  if (!confirmation) return;

  showLoader();
  try {
    await deleteOrder(orderId);
    showToast("Order record deleted successfully.", "success");
    
    // Sync local array
    allOrders = allOrders.filter(o => o.id !== orderId);
    
    // Refresh stats revenue and grid views
    const totalRevenue = allOrders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    document.getElementById("stat-total-revenue").textContent = `₹${totalRevenue.toLocaleString()}`;
    document.getElementById("stat-total-orders").textContent = allOrders.length;
    
    renderOrdersTable(document.getElementById("order-status-filter").value);
  } catch (err) {
    showToast("Error deleting order.", "error");
  } finally {
    hideLoader();
  }
}
