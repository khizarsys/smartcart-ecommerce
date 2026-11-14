/**
 * Admin panel (DEMO ONLY).
 * Authentication is a client-side password check against CONFIG.ADMIN_DEMO_PASSWORD.
 * It keeps casual visitors out of the UI but is not real security — anyone can read
 * the source. All edits are saved to localStorage in the current browser.
 */
import { CONFIG } from './config.js';
import {
  getProducts,
  saveProducts,
  resetProducts,
  createProductId,
  getOrders,
  updateOrderStatus,
} from './store.js';
import { initLayout, formatPrice, formatDate, escapeHtml, icons, showToast, renderError } from './ui.js';
import { rules, createValidator, setFieldError } from './validation.js';

const ORDER_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
const LOW_STOCK = 5;

const $ = (selector) => document.querySelector(selector);
const els = {
  loginView: $('#login-view'),
  loginForm: $('#login-form'),
  dashboard: $('#dashboard-view'),
  stats: $('#stats'),
  productRows: $('#product-rows'),
  productSearch: $('#product-search'),
  orderRows: $('#order-rows'),
  productDialog: $('#product-dialog'),
  productForm: $('#product-form'),
  orderDialog: $('#order-dialog'),
};

let products = [];
let editingId = null;
let productValidator = null;

/* ---------- Session ---------- */

function isSignedIn() {
  try {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION) === '1';
  } catch {
    return false;
  }
}

function setSignedIn(value) {
  try {
    if (value) sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION, '1');
    else sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
  } catch {
    /* session storage unavailable: user simply has to sign in again */
  }
}

function showView() {
  const signedIn = isSignedIn();
  els.loginView.hidden = signedIn;
  els.dashboard.hidden = !signedIn;
  if (signedIn) renderDashboard();
  else $('#admin-password').focus();
}

function bindLogin() {
  els.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = els.loginForm.elements.password;
    if (input.value === CONFIG.ADMIN_DEMO_PASSWORD) {
      setFieldError(els.loginForm, 'password', '');
      setSignedIn(true);
      input.value = '';
      showToast('Signed in to the admin panel.', 'success');
      showView();
    } else {
      setFieldError(els.loginForm, 'password', 'Incorrect password. Hint: see the demo notice above.');
      input.select();
    }
  });

  $('#logout').addEventListener('click', () => {
    setSignedIn(false);
    showToast('Signed out.', 'info');
    showView();
  });
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  renderStats();
  renderProducts();
  renderOrders();
}

function renderStats() {
  const orders = getOrders();
  const revenue = orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.totals.total, 0);
  const lowStock = products.filter((product) => product.stock <= LOW_STOCK).length;
  const stats = [
    { label: 'Products', value: products.length },
    { label: 'Orders', value: orders.length },
    { label: 'Revenue', value: formatPrice(revenue) },
    { label: `Low stock (≤ ${LOW_STOCK})`, value: lowStock, warn: lowStock > 0 },
  ];
  els.stats.innerHTML = stats
    .map((stat) => `<div class="stat ${stat.warn ? 'stat--warn' : ''}"><span class="muted small">${stat.label}</span><strong>${stat.value}</strong></div>`)
    .join('');
}

function stockBadge(stock) {
  if (stock <= 0) return `<span class="badge badge--danger">${stock}</span>`;
  if (stock <= LOW_STOCK) return `<span class="badge badge--info">${stock}</span>`;
  return String(stock);
}

function renderProducts() {
  const term = els.productSearch.value.trim().toLowerCase();
  const visible = products.filter((product) => !term || `${product.name} ${product.category}`.toLowerCase().includes(term));

  if (!visible.length) {
    els.productRows.innerHTML = `<tr><td colspan="6" class="table-empty">No products match your search.</td></tr>`;
    return;
  }

  els.productRows.innerHTML = visible
    .map(
      (product) => `
      <tr data-id="${escapeHtml(product.id)}">
        <td data-label="Product">
          <div class="table-product">
            <img src="${escapeHtml(product.image)}" alt="" width="44" height="44" loading="lazy">
            <div><a href="product.html?id=${encodeURIComponent(product.id)}" target="_blank" rel="noopener">${escapeHtml(product.name)}</a><span class="muted small">${escapeHtml(product.id)}</span></div>
          </div>
        </td>
        <td data-label="Category">${escapeHtml(product.category)}</td>
        <td data-label="Price" class="num">${formatPrice(product.price)}</td>
        <td data-label="Stock" class="num">${stockBadge(product.stock)}</td>
        <td data-label="Featured">${product.featured ? '<span class="badge badge--success">Yes</span>' : '<span class="muted">—</span>'}</td>
        <td class="actions-col">
          <button type="button" class="btn btn--ghost btn--icon btn--sm" data-action="edit" aria-label="Edit ${escapeHtml(product.name)}">${icons.edit(16)}</button>
          <button type="button" class="btn btn--ghost btn--icon btn--sm danger-hover" data-action="delete" aria-label="Delete ${escapeHtml(product.name)}">${icons.trash(16)}</button>
        </td>
      </tr>`
    )
    .join('');
}

function renderOrders() {
  const orders = getOrders();
  if (!orders.length) {
    els.orderRows.innerHTML = `<tr><td colspan="7" class="table-empty">No orders yet. Place one from the <a href="shop.html">shop</a> to see it here.</td></tr>`;
    return;
  }

  els.orderRows.innerHTML = orders
    .map(
      (order) => `
      <tr data-order="${escapeHtml(order.id)}">
        <td data-label="Order"><code>${escapeHtml(order.id)}</code></td>
        <td data-label="Date">${formatDate(order.createdAt)}</td>
        <td data-label="Customer">${escapeHtml(order.customer.fullName)}<span class="muted small block">${escapeHtml(order.customer.email)}</span></td>
        <td data-label="Items" class="num">${order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
        <td data-label="Total" class="num"><strong>${formatPrice(order.totals.total)}</strong></td>
        <td data-label="Status">
          <select class="select select--sm status-select status--${order.status.toLowerCase()}" data-action="status" aria-label="Status for order ${escapeHtml(order.id)}">
            ${ORDER_STATUSES.map((status) => `<option ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
        </td>
        <td class="actions-col"><button type="button" class="btn btn--ghost btn--sm" data-action="view">View</button></td>
      </tr>`
    )
    .join('');
}

function openOrderDialog(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) return;
  const { customer } = order;
  $('#order-dialog-title').textContent = `Order ${order.id}`;
  $('#order-dialog-body').innerHTML = `
    <p class="muted small">Placed ${formatDate(order.createdAt)} · ${escapeHtml(order.payment)} · <strong>${escapeHtml(order.status)}</strong></p>
    <div class="order-details">
      <div>
        <h3>Customer</h3>
        <p>${escapeHtml(customer.fullName)}<br><span class="muted">${escapeHtml(customer.email)}<br>${escapeHtml(customer.phone)}</span></p>
      </div>
      <div>
        <h3>Ship to</h3>
        <p class="muted">${escapeHtml(customer.address)}<br>${escapeHtml(customer.city)}, ${escapeHtml(customer.postalCode)}<br>${escapeHtml(customer.country)}</p>
      </div>
    </div>
    ${order.notes ? `<h3>Notes</h3><p class="muted">${escapeHtml(order.notes)}</p>` : ''}
    <ul class="mini-lines">
      ${order.items
        .map(
          (item) => `<li>
            <span class="mini-lines__img"><img src="${escapeHtml(item.image)}" alt="" width="56" height="56"><span class="mini-lines__qty">${item.qty}</span></span>
            <span class="mini-lines__name">${escapeHtml(item.name)}<span class="muted small">${formatPrice(item.price)} each</span></span>
            <strong>${formatPrice(item.lineTotal)}</strong>
          </li>`
        )
        .join('')}
    </ul>
    <dl class="totals">
      <div><dt>Subtotal</dt><dd>${formatPrice(order.totals.subtotal)}</dd></div>
      <div><dt>Shipping</dt><dd>${order.totals.shipping ? formatPrice(order.totals.shipping) : 'Free'}</dd></div>
      <div><dt>Tax</dt><dd>${formatPrice(order.totals.tax)}</dd></div>
      <div class="totals__grand"><dt>Total</dt><dd>${formatPrice(order.totals.total)}</dd></div>
    </dl>`;
  els.orderDialog.showModal();
}

/* ---------- Product form ---------- */

const productSchema = {
  name: [rules.required('Product name'), rules.minLength('Product name', 3)],
  category: [rules.required('Category')],
  stock: [rules.number('Stock', { min: 0, integer: true })],
  price: [rules.number('Price', { min: 0.01 })],
  compareAtPrice: [(value) => (String(value).trim() === '' ? '' : rules.number('Compare-at price', { min: 0 })(value))],
  rating: [rules.number('Rating', { min: 0, max: 5 })],
  reviews: [rules.number('Review count', { min: 0, integer: true })],
  image: [rules.required('Image')],
  description: [rules.required('Description'), rules.minLength('Description', 10)],
};

function fillDatalists() {
  const categories = [...new Set(products.map((product) => product.category))].sort();
  $('#category-options').innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join('');
  const images = [...new Set(products.map((product) => product.image))];
  $('#image-options').innerHTML = images.map((image) => `<option value="${escapeHtml(image)}"></option>`).join('');
}

function openProductDialog(product = null) {
  editingId = product ? product.id : null;
  const form = els.productForm;
  form.reset();
  Object.keys(productSchema).forEach((name) => setFieldError(form, name, ''));
  fillDatalists();

  $('#dialog-title').textContent = product ? 'Edit product' : 'Add product';
  $('#save-product').textContent = product ? 'Save changes' : 'Add product';

  const data = product || { stock: 10, rating: 4.5, reviews: 0, image: 'assets/images/categories/electronics.svg' };
  form.elements.name.value = data.name || '';
  form.elements.category.value = data.category || '';
  form.elements.stock.value = data.stock ?? '';
  form.elements.price.value = data.price ?? '';
  form.elements.compareAtPrice.value = data.compareAtPrice ?? '';
  form.elements.rating.value = data.rating ?? '';
  form.elements.reviews.value = data.reviews ?? '';
  form.elements.image.value = data.image || '';
  form.elements.description.value = data.description || '';
  form.elements.highlights.value = (data.highlights || []).join('\n');
  form.elements.featured.checked = Boolean(data.featured);

  els.productDialog.showModal();
  form.elements.name.focus();
}

function readProductForm() {
  const form = els.productForm.elements;
  const compare = form.compareAtPrice.value.trim();
  return {
    name: form.name.value.trim(),
    category: form.category.value.trim(),
    stock: Number(form.stock.value),
    price: Math.round(Number(form.price.value) * 100) / 100,
    compareAtPrice: compare === '' ? null : Math.round(Number(compare) * 100) / 100,
    rating: Math.round(Number(form.rating.value) * 10) / 10,
    reviews: Number(form.reviews.value),
    image: form.image.value.trim(),
    description: form.description.value.trim(),
    highlights: form.highlights.value.split('\n').map((line) => line.trim()).filter(Boolean),
    featured: form.featured.checked,
  };
}

function saveProductFromForm() {
  if (!productValidator.validateAll()) return;
  const data = readProductForm();
  if (data.compareAtPrice !== null && data.compareAtPrice <= data.price) {
    setFieldError(els.productForm, 'compareAtPrice', 'Compare-at price must be higher than the price (or left empty).');
    els.productForm.elements.compareAtPrice.focus();
    return;
  }

  if (editingId) {
    products = products.map((product) => (product.id === editingId ? { ...product, ...data } : product));
    showToast(`Updated “${data.name}”.`, 'success');
  } else {
    products = [{ id: createProductId(), ...data }, ...products];
    showToast(`Added “${data.name}” to the catalog.`, 'success');
  }
  saveProducts(products);
  els.productDialog.close();
  renderDashboard();
}

function deleteProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  if (!window.confirm(`Delete “${product.name}”? This cannot be undone (except by resetting the catalog).`)) return;
  products = products.filter((item) => item.id !== id);
  saveProducts(products);
  showToast(`Deleted “${product.name}”.`, 'info');
  renderDashboard();
}

/* ---------- Tabs ---------- */

function selectTab(tab) {
  document.querySelectorAll('[role="tab"]').forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(`#${item.getAttribute('aria-controls')}`).hidden = !selected;
  });
}

function bindTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    // Arrow-key navigation per the WAI-ARIA tabs pattern.
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });
}

/* ---------- Events ---------- */

function bindDashboard() {
  $('#add-product').addEventListener('click', () => openProductDialog());
  els.productSearch.addEventListener('input', renderProducts);

  els.productRows.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.closest('tr').dataset.id;
    if (button.dataset.action === 'edit') openProductDialog(products.find((product) => product.id === id));
    if (button.dataset.action === 'delete') deleteProduct(id);
  });

  els.orderRows.addEventListener('change', (event) => {
    const select = event.target.closest('select[data-action="status"]');
    if (!select) return;
    const orderId = select.closest('tr').dataset.order;
    updateOrderStatus(orderId, select.value);
    showToast(`Order ${orderId} marked as ${select.value}.`, 'success');
    renderStats();
    renderOrders();
  });

  els.orderRows.addEventListener('click', (event) => {
    if (event.target.closest('button[data-action="view"]')) openOrderDialog(event.target.closest('tr').dataset.order);
  });

  $('#reset-catalog').addEventListener('click', async () => {
    if (!window.confirm('Restore the original 30-product catalog? Your product edits will be lost (orders are kept).')) return;
    products = await resetProducts();
    showToast('Catalog restored to the original seed data.', 'info');
    renderDashboard();
  });

  productValidator = createValidator(els.productForm, productSchema);
  els.productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProductFromForm();
  });

  // Close buttons and backdrop clicks for both dialogs.
  [els.productDialog, els.orderDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
    });
  });
}

async function init() {
  initLayout();
  $('#demo-password').textContent = CONFIG.ADMIN_DEMO_PASSWORD;
  $('#login-icon').innerHTML = icons.lock(28);
  try {
    products = await getProducts();
  } catch (error) {
    renderError(document.querySelector('main'), error.message);
    return;
  }
  bindLogin();
  bindTabs();
  bindDashboard();
  showView();
}

init();
