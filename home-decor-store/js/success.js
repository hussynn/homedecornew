// Success page loader and WhatsApp redirect message compiler
import { getSettings, getSocialLinks, getOrders } from "./db.js";
import { renderHeader, renderFooter, showLoader, hideLoader, showToast } from "./ui.js";

// Page State variables
let storeSettings = {};
let socialLinks = {};
let currentOrder = null;

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  try {
    // 1. Parse URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const orderDocId = urlParams.get("orderId");

    if (!orderDocId) {
      window.location.href = "./index.html";
      return;
    }

    // 2. Fetch dependencies
    storeSettings = await getSettings();
    socialLinks = await getSocialLinks();
    
    // Find matching order in active orders list
    const orders = await getOrders();
    currentOrder = orders.find(o => o.id === orderDocId || o.orderId === orderDocId);

    if (!currentOrder) {
      showToast("Order record not found.", "error");
      setTimeout(() => { window.location.href = "./index.html"; }, 2000);
      return;
    }

    // 3. Render layouts
    renderHeader(storeSettings, "home");
    renderFooter(storeSettings, socialLinks);

    // 4. Populate receipt details
    populateReceiptDetails();

    // 5. Connect WhatsApp dynamic redirect
    document.getElementById("whatsapp-share-btn").addEventListener("click", redirectToWhatsApp);

  } catch (error) {
    console.error("Error displaying success details:", error);
    showToast("Error retrieving receipt details.", "error");
  } finally {
    hideLoader();
  }
});

// Render Order Receipt Summary
function populateReceiptDetails() {
  const container = document.getElementById("success-receipt-card");

  // Calculate estimated delivery: 7 days from now
  const orderTime = currentOrder.createdAt 
    ? (currentOrder.createdAt.seconds ? new Date(currentOrder.createdAt.seconds * 1000) : new Date(currentOrder.createdAt))
    : new Date();
  
  const deliveryDate = new Date(orderTime.getTime());
  deliveryDate.setDate(deliveryDate.getDate() + 7);

  // Formatting options
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDelivery = deliveryDate.toLocaleDateString('en-US', options);

  // Measurements formatting
  const sizeValue = currentOrder.width && currentOrder.height 
    ? `${currentOrder.width} x ${currentOrder.height} ${currentOrder.unit}` 
    : "Standard / Custom Accent";

  container.innerHTML = `
    <h4>Order Summary (Reference: ${currentOrder.orderId})</h4>
    
    <div class="success-row">
      <span class="success-label">Product Name:</span>
      <span class="success-value">${currentOrder.productName}</span>
    </div>
    
    <div class="success-row">
      <span class="success-label">Custom Dimensions:</span>
      <span class="success-value">${sizeValue}</span>
    </div>

    <div class="success-row">
      <span class="success-label">Payment Method:</span>
      <span class="success-value">${currentOrder.paymentMethod}</span>
    </div>
    
    <div class="success-row">
      <span class="success-label">Delivery Address:</span>
      <span class="success-value" style="max-width:300px; text-align:right;">${currentOrder.address}, PIN ${currentOrder.pinCode}</span>
    </div>

    <div class="success-row" style="border-top:1px solid #EFE9E1; padding-top:10px; margin-top:10px;">
      <span class="success-label" style="font-weight:600; color:#3C3225;">Total Amount paid/payable:</span>
      <span class="success-value" style="font-weight:700; color:#C5A880; font-size:1.15rem;">₹${Number(currentOrder.totalAmount).toLocaleString()}</span>
    </div>

    <div class="success-row" style="background-color:rgba(197,168,128,0.1); padding: 12px; border-radius:4px; margin-top:15px;">
      <span class="success-label" style="font-weight:600; color:#C5A880;"><i class="far fa-calendar-alt"></i> Est. Delivery:</span>
      <span class="success-value" style="font-weight:600; color:#3C3225;">${formattedDelivery}</span>
    </div>
  `;
}

// Compile and redirect to WhatsApp
function redirectToWhatsApp() {
  const storePhone = storeSettings.phone || "";
  const ownerWhatsapp = socialLinks.whatsapp || storePhone;

  // Clean WhatsApp number
  const cleanNumber = ownerWhatsapp.replace(/[^0-9]/g, "");

  if (!cleanNumber) {
    showToast("Store WhatsApp number is not configured.", "error");
    return;
  }

  // Compile detailed recipe template
  const sizeText = currentOrder.width && currentOrder.height 
    ? `${currentOrder.width} x ${currentOrder.height} ${currentOrder.unit}` 
    : "Standard Size / Accent";

  const messageText = `✨ *AURA DECOR - ORDER CONFIRMATION* ✨
----------------------------------------
*Order ID:* ${currentOrder.orderId}
*Status:* Pending Confirmation

*CUSTOMER INFO:*
*Name:* ${currentOrder.customerName}
*Phone:* +91 ${currentOrder.phone}
*Address:* ${currentOrder.address}, PIN ${currentOrder.pinCode}

*PRODUCT DETAIL:*
*Product:* ${currentOrder.productName}
*Size:* ${sizeText}

*BILLING & PAYMENT:*
*Method:* ${currentOrder.paymentMethod}
*Total Amount:* ₹${Number(currentOrder.totalAmount).toLocaleString()}
----------------------------------------
Please confirm my order details above. Thank you!`;

  const urlEncodedMsg = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${urlEncodedMsg}`;

  // Open in new tab
  window.open(whatsappUrl, "_blank");
}
