// Firestore CRUD Operations & Mock Fallbacks Module
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, isFirebaseConfigured } from "./firebase-config.js";

// --- MOCK DATA FOR DEMO MODE ---
const MOCK_SETTINGS = {
  storeName: "Aura Luxury Decor",
  logoUrl: "", // blank will render text logo
  upiId: "auradecor@okaxis",
  qrImage: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&auto=format&fit=crop", // placeholder QR
  address: "102, Gold Pavilion Heights, Elite Road, Mumbai, Maharashtra - 400001",
  phone: "+91 98765 43210",
  email: "concierge@auraluxurydecor.com",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.797223594951!2d72.8335029!3d18.9955799!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7cef0d0000001%3A0x2db4df44a9e52565!2sPalladium%20Mall!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
};

const MOCK_SOCIALS = {
  facebook: "https://facebook.com/auraluxurydecor",
  instagram: "https://instagram.com/auraluxurydecor",
  youtube: "https://youtube.com/auraluxurydecor",
  whatsapp: "919876543210"
};

const MOCK_SLIDES = [
  {
    id: "slide_1",
    title: "Elevate Your Living Space",
    subtitle: "Discover our premium handcrafted wallpapers and premium home interior designs.",
    imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&auto=format&fit=crop&q=80",
    active: true
  },
  {
    id: "slide_2",
    title: "Artisanal Doors & Details",
    subtitle: "Precision-engineered teak wood doors tailored to match your elegant entrance.",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80",
    active: true
  },
  {
    id: "slide_3",
    title: "Luxury Floor Mats & Accents",
    subtitle: "Exquisite patterns and rich textures to warm your stepping spaces.",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&auto=format&fit=crop&q=80",
    active: true
  }
];

const MOCK_CATEGORIES = [
  { id: "cat_wallpapers", name: "Wallpapers", imageUrl: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=300&auto=format&fit=crop&q=80", active: true, displayOrder: 1 },
  { id: "cat_doors", name: "Designer Doors", imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80", active: true, displayOrder: 2 },
  { id: "cat_mats", name: "Floor Mats", imageUrl: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=300&auto=format&fit=crop&q=80", active: true, displayOrder: 3 },
  { id: "cat_accents", name: "Home Accessories", imageUrl: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=300&auto=format&fit=crop&q=80", active: true, displayOrder: 4 }
];

const MOCK_PRODUCTS = [
  {
    id: "prod_royal_damask",
    name: "Royal Damask Wallpaper",
    categoryId: "cat_wallpapers",
    description: "Embossed luxury gold wallpaper with intricate damask patterns. Highly durable, moisture-resistant, and perfect for accent walls in living rooms, bedrooms, and dining spaces.\n\nMaterial: Premium Non-Woven Paper\nFinish: Semi-Gloss Gold Texturing\nRoll Coverage: 57 Sq.Ft.",
    images: [
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80"
    ],
    originalPrice: 1500,
    discountPrice: 999,
    discountPercent: 33,
    specifications: "Material: Non-Woven Premium Paper\nRoll Size: 10m x 0.53m\nOrigin: Imported (Italy)\nWashable: Yes",
    active: true,
    createdAt: Date.now()
  },
  {
    id: "prod_classic_teak",
    name: "Imperial Teakwood Door",
    categoryId: "cat_doors",
    description: "Solid Burma teakwood entrance door featuring custom geometric reliefs. Weatherproof coating ensures long-lasting luxury and resistance to elements.\n\nTimber: Kiln-dried Teakwood\nFrame Thickness: 40mm",
    images: [
      "https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80"
    ],
    originalPrice: 45000,
    discountPrice: 38000,
    discountPercent: 15,
    specifications: "Timber Type: Seasoned Teak\nThickness: 45mm\nFinish: Melamine Glossy Polish\nWarranty: 10 Years",
    active: true,
    createdAt: Date.now() - 86400000
  },
  {
    id: "prod_velvet_mat",
    name: "Plush Velvet Entryway Mat",
    categoryId: "cat_mats",
    description: "Extremely soft, high-pile micro-polyester entryway mat with a non-slip rubber backing. Offers ultimate absorption and comfort.",
    images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80"
    ],
    originalPrice: 1200,
    discountPrice: 799,
    discountPercent: 33,
    specifications: "Material: Micro-Polyester\nBacking: Anti-slip TPR Rubber\nPile Height: 15mm\nWash instructions: Machine Washable",
    active: true,
    createdAt: Date.now() - 172800000
  },
  {
    id: "prod_gold_urn",
    name: "Hand-Carved Ceramic Gold Urn",
    categoryId: "cat_accents",
    description: "An elegant centerpiece ceramic vase finished with textured 24k-gold paint gilding. Fits perfectly on sideboards, consoles, and center tables.",
    images: [
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606744824163-985d376605aa?w=800&auto=format&fit=crop&q=80"
    ],
    originalPrice: 3500,
    discountPrice: 2499,
    discountPercent: 29,
    specifications: "Material: Glazed Stoneware\nHeight: 18 Inches\nWeight: 2.8 Kg\nFinish: Textured Gold Foil",
    active: true,
    createdAt: Date.now() - 259200000
  }
];

// Load local-storage database state helper for demo mode
function getDemoStorage(key, defaultData) {
  const data = localStorage.getItem(`DEMO_DB_${key}`);
  if (!data) {
    localStorage.setItem(`DEMO_DB_${key}`, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
}

function saveDemoStorage(key, data) {
  localStorage.setItem(`DEMO_DB_${key}`, JSON.stringify(data));
}

// --- DATABASE SERVICE IMPLEMENTATION ---

// 1. SETTINGS & CONTACT INFO
export async function getSettings() {
  if (!isFirebaseConfigured()) {
    return getDemoStorage("settings", MOCK_SETTINGS);
  }
  try {
    const docRef = doc(db, "settings", "store");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Create with defaults if not exists
      await setDoc(docRef, MOCK_SETTINGS);
      return MOCK_SETTINGS;
    }
  } catch (error) {
    console.error("Error reading settings:", error);
    return MOCK_SETTINGS;
  }
}

export async function updateSettings(data) {
  if (!isFirebaseConfigured()) {
    const current = getDemoStorage("settings", MOCK_SETTINGS);
    const updated = { ...current, ...data };
    saveDemoStorage("settings", updated);
    return true;
  }
  try {
    const docRef = doc(db, "settings", "store");
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
}

// 2. SOCIAL LINKS
export async function getSocialLinks() {
  if (!isFirebaseConfigured()) {
    return getDemoStorage("socialLinks", MOCK_SOCIALS);
  }
  try {
    const docRef = doc(db, "socialLinks", "links");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      await setDoc(docRef, MOCK_SOCIALS);
      return MOCK_SOCIALS;
    }
  } catch (error) {
    console.error("Error reading socialLinks:", error);
    return MOCK_SOCIALS;
  }
}

export async function updateSocialLinks(data) {
  if (!isFirebaseConfigured()) {
    const current = getDemoStorage("socialLinks", MOCK_SOCIALS);
    const updated = { ...current, ...data };
    saveDemoStorage("socialLinks", updated);
    return true;
  }
  try {
    const docRef = doc(db, "socialLinks", "links");
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating socialLinks:", error);
    throw error;
  }
}

// 3. HERO SLIDES
export async function getHeroSlides(activeOnly = true) {
  if (!isFirebaseConfigured()) {
    const slides = getDemoStorage("heroSlides", MOCK_SLIDES);
    return activeOnly ? slides.filter(s => s.active) : slides;
  }
  try {
    const q = query(collection(db, "heroSlides"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return activeOnly ? list.filter(s => s.active) : list;
  } catch (error) {
    console.error("Error reading heroSlides:", error);
    return MOCK_SLIDES;
  }
}

export async function addHeroSlide(slideData) {
  if (!isFirebaseConfigured()) {
    const slides = getDemoStorage("heroSlides", MOCK_SLIDES);
    const newSlide = { id: `slide_${Date.now()}`, ...slideData };
    slides.unshift(newSlide);
    saveDemoStorage("heroSlides", slides);
    return newSlide.id;
  }
  try {
    const data = { ...slideData, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "heroSlides"), data);
    return docRef.id;
  } catch (error) {
    console.error("Error adding slide:", error);
    throw error;
  }
}

export async function updateHeroSlide(id, slideData) {
  if (!isFirebaseConfigured()) {
    const slides = getDemoStorage("heroSlides", MOCK_SLIDES);
    const index = slides.findIndex(s => s.id === id);
    if (index !== -1) {
      slides[index] = { ...slides[index], ...slideData };
      saveDemoStorage("heroSlides", slides);
      return true;
    }
    return false;
  }
  try {
    const docRef = doc(db, "heroSlides", id);
    await updateDoc(docRef, slideData);
    return true;
  } catch (error) {
    console.error("Error updating slide:", error);
    throw error;
  }
}

export async function deleteHeroSlide(id) {
  if (!isFirebaseConfigured()) {
    const slides = getDemoStorage("heroSlides", MOCK_SLIDES);
    const updated = slides.filter(s => s.id !== id);
    saveDemoStorage("heroSlides", updated);
    return true;
  }
  try {
    await deleteDoc(doc(db, "heroSlides", id));
    return true;
  } catch (error) {
    console.error("Error deleting slide:", error);
    throw error;
  }
}

// 4. CATEGORIES
export async function getCategories(activeOnly = true) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("categories", MOCK_CATEGORIES);
    const sorted = list.sort((a, b) => a.displayOrder - b.displayOrder);
    return activeOnly ? sorted.filter(c => c.active) : sorted;
  }
  try {
    const q = query(collection(db, "categories"), orderBy("displayOrder", "asc"));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return activeOnly ? list.filter(c => c.active) : list;
  } catch (error) {
    console.error("Error reading categories:", error);
    return MOCK_CATEGORIES;
  }
}

export async function addCategory(categoryData) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("categories", MOCK_CATEGORIES);
    const newCat = { id: `cat_${Date.now()}`, ...categoryData };
    list.push(newCat);
    saveDemoStorage("categories", list);
    return newCat.id;
  }
  try {
    const docRef = await addDoc(collection(db, "categories"), categoryData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
}

export async function updateCategory(id, categoryData) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("categories", MOCK_CATEGORIES);
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...categoryData };
      saveDemoStorage("categories", list);
      return true;
    }
    return false;
  }
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, categoryData);
    return true;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}

export async function deleteCategory(id) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("categories", MOCK_CATEGORIES);
    const updated = list.filter(c => c.id !== id);
    saveDemoStorage("categories", updated);
    return true;
  }
  try {
    await deleteDoc(doc(db, "categories", id));
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

// 5. PRODUCTS
export async function getProducts(categoryId = null, activeOnly = true) {
  if (!isFirebaseConfigured()) {
    let list = getDemoStorage("products", MOCK_PRODUCTS);
    if (categoryId) {
      list = list.filter(p => p.categoryId === categoryId);
    }
    return activeOnly ? list.filter(p => p.active) : list;
  }
  try {
    let q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    if (categoryId) {
      q = query(collection(db, "products"), where("categoryId", "==", categoryId), orderBy("createdAt", "desc"));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return activeOnly ? list.filter(p => p.active) : list;
  } catch (error) {
    console.error("Error reading products:", error);
    return MOCK_PRODUCTS.filter(p => !categoryId || p.categoryId === categoryId);
  }
}

export async function getProductById(id) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("products", MOCK_PRODUCTS);
    return list.find(p => p.id === id) || null;
  }
  try {
    const docRef = doc(db, "products", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error reading product details:", error);
    return MOCK_PRODUCTS.find(p => p.id === id) || null;
  }
}

export async function addProduct(productData) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("products", MOCK_PRODUCTS);
    const newProd = { id: `prod_${Date.now()}`, ...productData, createdAt: Date.now() };
    list.unshift(newProd);
    saveDemoStorage("products", list);
    return newProd.id;
  }
  try {
    const data = { ...productData, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "products"), data);
    return docRef.id;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
}

export async function updateProduct(id, productData) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("products", MOCK_PRODUCTS);
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...productData };
      saveDemoStorage("products", list);
      return true;
    }
    return false;
  }
  try {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, productData);
    return true;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}

export async function deleteProduct(id) {
  if (!isFirebaseConfigured()) {
    const list = getDemoStorage("products", MOCK_PRODUCTS);
    const updated = list.filter(p => p.id !== id);
    saveDemoStorage("products", updated);
    return true;
  }
  try {
    await deleteDoc(doc(db, "products", id));
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

// 6. ORDERS
export async function getOrders() {
  if (!isFirebaseConfigured()) {
    return getDemoStorage("orders", []);
  }
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error reading orders:", error);
    return [];
  }
}

export async function addOrder(orderData) {
  const customId = "AD-" + Math.floor(100000 + Math.random() * 900000);
  const fullOrder = {
    orderId: customId,
    status: "pending",
    ...orderData
  };

  if (!isFirebaseConfigured()) {
    const orders = getDemoStorage("orders", []);
    const savedOrder = { id: `order_${Date.now()}`, ...fullOrder, createdAt: Date.now() };
    orders.unshift(savedOrder);
    saveDemoStorage("orders", orders);
    return savedOrder;
  }
  try {
    const data = { ...fullOrder, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "orders"), data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error("Error creating order in Firestore:", error);
    throw error;
  }
}

export async function updateOrderStatus(id, status) {
  if (!isFirebaseConfigured()) {
    const orders = getDemoStorage("orders", []);
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders[idx].status = status;
      saveDemoStorage("orders", orders);
      return true;
    }
    return false;
  }
  try {
    const docRef = doc(db, "orders", id);
    await updateDoc(docRef, { status: status });
    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}

export async function deleteOrder(id) {
  if (!isFirebaseConfigured()) {
    const orders = getDemoStorage("orders", []);
    const updated = orders.filter(o => o.id !== id);
    saveDemoStorage("orders", updated);
    return true;
  }
  try {
    await deleteDoc(doc(db, "orders", id));
    return true;
  } catch (error) {
    console.error("Error deleting order:", error);
    throw error;
  }
}
