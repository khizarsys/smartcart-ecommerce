/**
 * Shopping cart logic. The cart is persisted in localStorage as a list of
 * { id, qty } entries; product details are always looked up from the store so
 * price changes made in the admin panel are reflected immediately.
 */
import { CONFIG } from './config.js';
import { readJSON, writeJSON } from './storage.js';

const CART_EVENT = 'cart:change';

export function getCart() {
  const cart = readJSON(CONFIG.STORAGE_KEYS.CART, []);
  return Array.isArray(cart) ? cart.filter((item) => item && item.id && item.qty > 0) : [];
}

function saveCart(cart) {
  writeJSON(CONFIG.STORAGE_KEYS.CART, cart);
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { cart } }));
}

export function onCartChange(handler) {
  window.addEventListener(CART_EVENT, handler);
  // Keep multiple open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === CONFIG.STORAGE_KEYS.CART) handler();
  });
}

function clampQty(qty, stock) {
  const max = Math.min(CONFIG.MAX_QTY_PER_ITEM, stock ?? CONFIG.MAX_QTY_PER_ITEM);
  return Math.max(1, Math.min(max, Math.floor(Number(qty) || 1)));
}

/**
 * Adds a product to the cart.
 * Returns { added, qty, limited } where `limited` is true if the requested
 * quantity was capped by stock or the per-item maximum.
 */
export function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  const requested = (existing ? existing.qty : 0) + qty;
  const finalQty = clampQty(requested, product.stock);

  if (existing) existing.qty = finalQty;
  else cart.push({ id: product.id, qty: finalQty });

  saveCart(cart);
  return { added: finalQty - (requested - qty), qty: finalQty, limited: finalQty < requested };
}

export function updateQuantity(productId, qty, stock) {
  const cart = getCart().map((item) => (item.id === productId ? { ...item, qty: clampQty(qty, stock) } : item));
  saveCart(cart);
}

export function removeFromCart(productId) {
  saveCart(getCart().filter((item) => item.id !== productId));
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Joins the cart with product data. Items whose product no longer exists
 * (e.g. deleted by an admin) are dropped.
 */
export function getCartLines(products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return getCart()
    .filter((item) => byId.has(item.id))
    .map((item) => {
      const product = byId.get(item.id);
      return { product, qty: item.qty, lineTotal: roundMoney(product.price * item.qty) };
    });
}

export function calculateTotals(lines) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const shipping = subtotal === 0 || subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
  const tax = roundMoney(subtotal * CONFIG.TAX_RATE);
  const total = roundMoney(subtotal + shipping + tax);
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  return { subtotal, shipping, tax, total, itemCount };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
