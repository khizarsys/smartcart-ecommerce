/**
 * Shared UI helpers: header/footer, theme toggle, toasts, formatting and
 * reusable product card markup.
 */
import { CONFIG } from './config.js';
import { getCartCount, onCartChange, addToCart } from './cart.js';
import { readJSON, writeJSON } from './storage.js';

/* ---------- Icons (inline SVG, inherit currentColor) ---------- */

const svg = (paths, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  cart: (s) => svg('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>', s),
  sun: (s) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', s),
  moon: (s) => svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', s),
  menu: (s) => svg('<path d="M3 6h18M3 12h18M3 18h18"/>', s),
  close: (s) => svg('<path d="M18 6 6 18M6 6l12 12"/>', s),
  search: (s) => svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', s),
  check: (s) => svg('<path d="M20 6 9 17l-5-5"/>', s),
  alert: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', s),
  info: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', s),
  trash: (s) => svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', s),
  edit: (s) => svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', s),
  plus: (s) => svg('<path d="M12 5v14M5 12h14"/>', s),
  minus: (s) => svg('<path d="M5 12h14"/>', s),
  truck: (s) => svg('<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>', s),
  shield: (s) => svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', s),
  refresh: (s) => svg('<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>', s),
  lock: (s) => svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s),
  arrowRight: (s) => svg('<path d="M5 12h14M12 5l7 7-7 7"/>', s),
};

/* ---------- Formatting ---------- */

const priceFormatter = new Intl.NumberFormat(CONFIG.LOCALE, { style: 'currency', currency: CONFIG.CURRENCY });
export const formatPrice = (value) => priceFormatter.format(value);

export function formatDate(iso) {
  return new Date(iso).toLocaleString(CONFIG.LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Escapes user/admin-provided text before inserting it into HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function renderStars(rating) {
  const rounded = Math.round(rating * 2) / 2;
  let html = '';
  for (let i = 1; i <= 5; i += 1) {
    const cls = rounded >= i ? 'full' : rounded >= i - 0.5 ? 'half' : 'empty';
    html += `<span class="star ${cls}">★</span>`;
  }
  return `<span class="stars" aria-label="Rated ${rating} out of 5">${html}</span>`;
}

/* ---------- Product card ---------- */

export function productCard(product) {
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const outOfStock = product.stock <= 0;
  const discount = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const url = `product.html?id=${encodeURIComponent(product.id)}`;

  return `
    <article class="product-card">
      <a href="${url}" class="product-card__media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="600" height="600">
        ${onSale ? `<span class="badge badge--sale">-${discount}%</span>` : ''}
        ${outOfStock ? '<span class="badge badge--muted">Sold out</span>' : ''}
      </a>
      <div class="product-card__body">
        <p class="product-card__category">${escapeHtml(product.category)}</p>
        <h3 class="product-card__title"><a href="${url}">${escapeHtml(product.name)}</a></h3>
        <div class="product-card__rating">${renderStars(product.rating)}<span>(${product.reviews})</span></div>
        <div class="product-card__footer">
          <div class="price">
            <span class="price__current">${formatPrice(product.price)}</span>
            ${onSale ? `<span class="price__old">${formatPrice(product.compareAtPrice)}</span>` : ''}
          </div>
          <button class="btn btn--icon btn--primary" data-add-to-cart="${escapeHtml(product.id)}" ${outOfStock ? 'disabled' : ''} aria-label="Add ${escapeHtml(product.name)} to cart">
            ${icons.plus(18)}
          </button>
        </div>
      </div>
    </article>`;
}

/**
 * Delegated click handler for any [data-add-to-cart] button inside `container`.
 * `products` may be an array or a function returning the current array.
 */
export function bindAddToCart(container, products) {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) return;
    const list = typeof products === 'function' ? products() : products;
    const product = list.find((item) => item.id === button.dataset.addToCart);
    if (product) addProductWithToast(product, 1);
  });
}

export function addProductWithToast(product, qty) {
  if (product.stock <= 0) {
    showToast(`${product.name} is out of stock.`, 'error');
    return;
  }
  const result = addToCart(product, qty);
  if (result.added <= 0) {
    showToast(`You already have the maximum quantity of ${product.name} in your cart.`, 'info');
  } else if (result.limited) {
    showToast(`Added ${result.added} × ${product.name}. Quantity limited by available stock.`, 'info');
  } else {
    showToast(`Added ${qty > 1 ? `${qty} × ` : ''}${product.name} to your cart.`, 'success', { label: 'View cart', href: 'cart.html' });
  }
}

/* ---------- Toasts ---------- */

function getToastRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {{label: string, href: string}} [action] optional link inside the toast
 */
export function showToast(message, type = 'success', action) {
  const region = getToastRegion();
  const toast = document.createElement('div');
  const icon = type === 'success' ? icons.check(18) : type === 'error' ? icons.alert(18) : icons.info(18);
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icon}</span>
    <span class="toast__message">${escapeHtml(message)}</span>
    ${action ? `<a class="toast__action" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>` : ''}
    <button class="toast__close" aria-label="Dismiss notification">${icons.close(16)}</button>`;

  const dismiss = () => {
    toast.classList.add('toast--leaving');
    setTimeout(() => toast.remove(), 250);
  };
  toast.querySelector('.toast__close').addEventListener('click', dismiss);
  region.appendChild(toast);

  // Keep at most 4 toasts on screen.
  while (region.children.length > 4) region.firstElementChild.remove();
  setTimeout(dismiss, 3800);
}

/* ---------- Theme ---------- */

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  writeJSON(CONFIG.STORAGE_KEYS.THEME, theme);
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.innerHTML = theme === 'dark' ? icons.sun() : icons.moon();
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

/* ---------- Header & footer ---------- */

const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'shop.html', label: 'Shop' },
  { href: 'cart.html', label: 'Cart' },
  { href: 'admin.html', label: 'Admin' },
];

function currentPage() {
  const file = window.location.pathname.split('/').pop();
  return file === '' ? 'index.html' : file;
}

function renderHeader() {
  const header = document.querySelector('#site-header');
  if (!header) return;
  const page = currentPage();
  const activePage = page === 'product.html' ? 'shop.html' : page === 'checkout.html' || page === 'thank-you.html' ? 'cart.html' : page;

  header.className = 'site-header';
  header.innerHTML = `
    <div class="container site-header__inner">
      <a href="index.html" class="logo" aria-label="${CONFIG.STORE_NAME} home">
        <span class="logo__mark">${icons.cart(18)}</span>
        <span>Smart<strong>Cart</strong></span>
      </a>
      <form class="header-search" action="shop.html" role="search">
        ${icons.search(18)}
        <input type="search" name="q" placeholder="Search products…" aria-label="Search products">
      </form>
      <nav class="main-nav" id="main-nav" aria-label="Main">
        ${NAV_LINKS.map((link) => `<a href="${link.href}" ${link.href === activePage ? 'aria-current="page"' : ''}>${link.label}</a>`).join('')}
      </nav>
      <div class="header-actions">
        <button class="btn btn--ghost btn--icon" data-theme-toggle></button>
        <a href="cart.html" class="btn btn--ghost btn--icon cart-link" aria-label="Cart">
          ${icons.cart()}
          <span class="cart-badge" data-cart-count hidden>0</span>
        </a>
        <button class="btn btn--ghost btn--icon menu-toggle" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu">${icons.menu()}</button>
      </div>
    </div>`;

  const menuToggle = header.querySelector('.menu-toggle');
  const nav = header.querySelector('.main-nav');
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuToggle.innerHTML = open ? icons.close() : icons.menu();
  });

  header.querySelector('[data-theme-toggle]').addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  const searchInput = header.querySelector('.header-search input');
  const q = getQueryParam('q');
  if (q && page === 'shop.html') searchInput.value = q;
}

function renderFooter() {
  const footer = document.querySelector('#site-footer');
  if (!footer) return;
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container site-footer__grid">
      <div>
        <a href="index.html" class="logo"><span class="logo__mark">${icons.cart(18)}</span><span>Smart<strong>Cart</strong></span></a>
        <p class="muted">Everyday essentials and thoughtful upgrades, delivered fast. Built with vanilla HTML, CSS and JavaScript.</p>
      </div>
      <div>
        <h4>Shop</h4>
        <a href="shop.html">All products</a>
        <a href="shop.html?sort=price-asc">Best value</a>
        <a href="shop.html?sort=rating">Top rated</a>
      </div>
      <div>
        <h4>Help</h4>
        <a href="cart.html">Your cart</a>
        <a href="checkout.html">Checkout</a>
        <a href="admin.html">Admin (demo)</a>
      </div>
      <div>
        <h4>Why SmartCart</h4>
        <p class="muted">Free shipping over ${formatPrice(CONFIG.FREE_SHIPPING_THRESHOLD)} · 30-day returns · Secure checkout</p>
      </div>
    </div>
    <div class="container site-footer__bottom">
      <p>© ${new Date().getFullYear()} SmartCart. A portfolio demo — no real payments are processed.</p>
    </div>`;
}

export function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
  badge.closest('.cart-link')?.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}`);
}

/** Bootstraps shared chrome on every page. */
export function initLayout() {
  renderHeader();
  renderFooter();
  applyTheme(readJSON(CONFIG.STORAGE_KEYS.THEME, null) || currentTheme());
  updateCartBadge();
  onCartChange(updateCartBadge);
}

/** Renders a friendly error state into a container. */
export function renderError(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__icon">${icons.alert(32)}</span>
      <h2>Something went wrong</h2>
      <p class="muted">${escapeHtml(message)}</p>
      <p class="muted small">Tip: open the site through a local web server (see README) — browsers block module scripts on <code>file://</code>.</p>
    </div>`;
}
