// Checkout page form handling and order placement logic module
import { getSettings, getSocialLinks, getProductById, getCategories, addOrder } from "./db.js";
import { renderHeader, renderFooter, showLoader, hideLoader, showToast } from "./ui.js";

// Page State variables
let storeSettings = {};
let currentProduct = null;
let currentCategory = null;
let totalPayableAmount = 0;

// URL parameters
let productId = "";
let paramWidth = 0;
let paramHeight = 0;
let paramUnit = "Feet";
let requiresMeasurement = false;

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  try {
    // 1. Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    productId = urlParams.get("productId");
    paramWidth = parseFloat(urlParams.get("width")) || 0;
    paramHeight = parseFloat(urlParams.get("height")) || 0;
    paramUnit = urlParams.get("unit") || "Feet";

    if (!productId) {
      window.location.href = "./index.html";
      return;
    }

    // 2. Fetch record dependencies
    storeSettings = await getSettings();
    const socials = await getSocialLinks();
    currentProduct = await getProductById(productId);

    if (!currentProduct) {
      showToast("Product not found.", "error");
      setTimeout(() => { window.location.href = "./index.html"; }, 2000);
      return;
    }

    const categories = await getCategories(false);
    currentCategory = categories.find(c => c.id === currentProduct.categoryId);

    // 3. Render layouts
    renderHeader(storeSettings, "categories");
    renderFooter(storeSettings, socials);

    // 4. Determine measurement checks
    const categoryName = currentCategory ? currentCategory.name : "Decor";
    requiresMeasurement = paramWidth > 0 && paramHeight > 0;

    // 5. Populate layout views
    populateOrderSummary(categoryName);
    setupPaymentOptions();
    setupUpiDetails();

    // 6. Connect Place Order binder
    document.getElementById("place-order-btn").addEventListener("click", handleOrderSubmit);

  } catch (error) {
    console.error("Error loading checkout details:", error);
    showToast("Error loading page details.", "error");
  } finally {
    hideLoader();
  }
});

// Render Sidebar order pricing summary
function populateOrderSummary(categoryName) {
  // Image
  const imgUrl = currentProduct.images?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300";
  document.getElementById("summary-prod-img").src = imgUrl;

  // Title
  document.getElementById("summary-prod-name").textContent = currentProduct.name;
  document.getElementById("summary-prod-category").textContent = categoryName;

  // Calculation details
  const rate = Number(currentProduct.discountPrice || currentProduct.originalPrice);
  document.getElementById("summary-rate-val").textContent = `₹${rate.toLocaleString()}`;

  const dimRow = document.getElementById("summary-dimension-row");
  const areaRow = document.getElementById("summary-area-row");

  if (requiresMeasurement) {
    // Measurement details display
    dimRow.style.display = "flex";
    areaRow.style.display = "flex";
    document.getElementById("summary-dimension-val").textContent = `${paramWidth} x ${paramHeight} ${paramUnit}`;

    let areaInSqFt = 0;
    if (paramUnit === "Feet") {
      areaInSqFt = paramWidth * paramHeight;
    } else if (paramUnit === "Inches") {
      areaInSqFt = (paramWidth / 12) * (paramHeight / 12);
    } else if (paramUnit === "Cm") {
      areaInSqFt = (paramWidth / 30.48) * (paramHeight / 30.48);
    }

    document.getElementById("summary-area-val").textContent = `${areaInSqFt.toFixed(2)} Sq.Ft`;
    totalPayableAmount = Math.max(0, Math.ceil(areaInSqFt * rate));
  } else {
    // Hide measurement rows
    dimRow.style.display = "none";
    areaRow.style.display = "none";
    totalPayableAmount = rate;
  }

  document.getElementById("summary-total-price").textContent = `₹${totalPayableAmount.toLocaleString()}`;
}

// Setup radio options switches
function setupPaymentOptions() {
  const codOpt = document.getElementById("pay-opt-cod");
  const upiOpt = document.getElementById("pay-opt-upi");
  const codRadio = document.getElementById("radio-cod");
  const upiRadio = document.getElementById("radio-upi");
  const upiPanel = document.getElementById("upi-details-root");

  const selectCod = () => {
    codOpt.classList.add("active");
    upiOpt.classList.remove("active");
    codRadio.checked = true;
    upiPanel.style.display = "none";
  };

  const selectUpi = () => {
    upiOpt.classList.add("active");
    codOpt.classList.remove("active");
    upiRadio.checked = true;
    upiPanel.style.display = "block";
  };

  codOpt.addEventListener("click", selectCod);
  upiOpt.addEventListener("click", selectUpi);

  // default initial trigger
  selectCod();
}

// Populate QR and UPI addresses
function setupUpiDetails() {
  const upiId = storeSettings.upiId || "auradecor@okaxis";
  const qrUrl = storeSettings.qrImage || "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=300";

  document.getElementById("upi-id-label").textContent = upiId;
  document.getElementById("upi-qr-image").src = qrUrl;

  // Copy button action
  const copyBtn = document.getElementById("copy-upi-btn");
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(upiId).then(() => {
      showToast("UPI ID copied to clipboard!", "success");
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
      showToast("Could not copy UPI ID.", "error");
    });
  });

  // Pay buttons deep linking
  // upi://pay?pa=UPI_ID&pn=MERCHANT_NAME&am=AMOUNT&cu=INR
  const storeNameEncoded = encodeURIComponent(storeSettings.storeName || "Aura Decor");
  const upiIntentUri = `upi://pay?pa=${upiId}&pn=${storeNameEncoded}&am=${totalPayableAmount}&cu=INR`;

  // Standard upi protocols trigger app picker on android/ios
  document.getElementById("pay-gpay-link").href = upiIntentUri;
  document.getElementById("pay-phonepe-link").href = upiIntentUri;
}

// Place Order Form submit validation
async function handleOrderSubmit() {
  // Validate inputs
  const name = document.getElementById("cust-name").value.trim();
  const phone = document.getElementById("cust-phone").value.trim();
  const email = document.getElementById("cust-email").value.trim();
  const address = document.getElementById("cust-address").value.trim();
  const pincode = document.getElementById("cust-pincode").value.trim();
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

  if (!name || !phone || !address || !pincode) {
    showToast("Please fill in all required (*) address fields.", "error");
    return;
  }

  // Validate Indian Phone number (10 digit format)
  const phoneClean = phone.replace(/[^0-9]/g, "");
  if (phoneClean.length !== 10) {
    showToast("Please enter a valid 10-digit mobile number.", "error");
    return;
  }

  // Validate Pincode (6 digit format)
  const pinClean = pincode.replace(/[^0-9]/g, "");
  if (pinClean.length !== 6) {
    showToast("Please enter a valid 6-digit PIN code.", "error");
    return;
  }

  showLoader();
  try {
    // Compile order record
    const orderData = {
      customerName: name,
      phone: phoneClean,
      email: email,
      address: address,
      pinCode: pinClean,
      productId: currentProduct.id,
      productName: currentProduct.name,
      width: requiresMeasurement ? paramWidth : null,
      height: requiresMeasurement ? paramHeight : null,
      unit: requiresMeasurement ? paramUnit : null,
      paymentMethod: paymentMethod,
      totalAmount: totalPayableAmount
    };

    // Save record in Firestore (or local state)
    const result = await addOrder(orderData);
    
    showToast("Order placed successfully!", "success");
    
    // Redirect to success receipt page
    window.location.href = `./success.html?orderId=${result.id}`;

  } catch (error) {
    console.error("Order submission failure:", error);
    showToast("Could not submit order. Please try again.", "error");
  } finally {
    hideLoader();
  }
}
