/**
 * Product and order data layer.
 *
 * Seed products come from data/products.json. Once an admin edits the catalog,
 * the full product list is stored in localStorage and takes precedence over
 * the seed file. "Reset catalog" in the admin panel restores the seed data.
 */
import { CONFIG } from './config.js';
import { readJSON, writeJSON, removeKey } from './storage.js';

const { STORAGE_KEYS } = CONFIG;
let cachedProducts = null;
let pendingLoad = null;

async function fetchSeedProducts() {
  const response = await fetch(CONFIG.PRODUCTS_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load products (HTTP ${response.status})`);
  const data = await response.json();
  return data.products;
}

/** Returns all products (admin edits first, otherwise the seed file). */
export async function getProducts() {
  if (cachedProducts) return cachedProducts;
  // Share one in-flight request between parallel callers.
  if (!pendingLoad) {
    const stored = readJSON(STORAGE_KEYS.PRODUCTS, null);
    pendingLoad = (Array.isArray(stored) ? Promise.resolve(stored) : fetchSeedProducts())
      .then((products) => {
        cachedProducts = products;
        return products;
      })
      .finally(() => {
        pendingLoad = null;
      });
  }
  return pendingLoad;
}

export async function getProductById(id) {
  const products = await getProducts();
  return products.find((product) => product.id === id) || null;
}

export async function getCategories() {
  const products = await getProducts();
  const counts = new Map();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, slug: slugify(name), count }));
}

export function saveProducts(products) {
  cachedProducts = products;
  writeJSON(STORAGE_KEYS.PRODUCTS, products);
}

export async function resetProducts() {
  removeKey(STORAGE_KEYS.PRODUCTS);
  cachedProducts = null;
  return getProducts();
}

/** Generates a short unique product id such as "p-lx3k9a". */
export function createProductId() {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/* ---------- Orders ---------- */

export function getOrders() {
  return readJSON(STORAGE_KEYS.ORDERS, []);
}

export function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  writeJSON(STORAGE_KEYS.ORDERS, orders);
  writeJSON(STORAGE_KEYS.LAST_ORDER, order.id);
  return order;
}

export function updateOrderStatus(orderId, status) {
  const orders = getOrders().map((order) => (order.id === orderId ? { ...order, status } : order));
  writeJSON(STORAGE_KEYS.ORDERS, orders);
}

export function getOrderById(orderId) {
  return getOrders().find((order) => order.id === orderId) || null;
}

export function getLastOrderId() {
  return readJSON(STORAGE_KEYS.LAST_ORDER, null);
}

/** Order numbers look like "SC-240611-4821". */
export function createOrderId() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SC-${stamp}-${random}`;
}

export function slugify(text) {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
