import { getProducts } from '../store.js';
import { getCart, onCartChange } from '../cart.js';
import { CONFIG } from '../config.js';
import {
  initLayout,
  productCard,
  bindAddToCart,
  addProductWithToast,
  renderError,
  renderStars,
  formatPrice,
  escapeHtml,
  getQueryParam,
  icons,
} from '../ui.js';

const root = document.querySelector('#product-root');
const RELATED_LIMIT = 4;

function stockLabel(stock) {
  if (stock <= 0) return '<span class="badge badge--danger">Out of stock</span>';
  if (stock <= 10) return `<span class="badge badge--info">Only ${stock} left</span>`;
  return '<span class="badge badge--success">In stock</span>';
}

function maxQuantity(product) {
  return Math.min(CONFIG.MAX_QTY_PER_ITEM, product.stock);
}

function renderNotFound() {
  document.title = 'Product not found — SmartCart';
  root.className = '';
  root.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__icon">${icons.search(28)}</span>
      <h2>Product not found</h2>
      <p class="muted">This product may have been removed or the link is incorrect.</p>
      <a class="btn btn--primary" href="shop.html">Back to shop</a>
    </div>`;
}

function renderProduct(product) {
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const savings = onSale ? product.compareAtPrice - product.price : 0;
  const outOfStock = product.stock <= 0;
  const max = Math.max(1, maxQuantity(product));
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];

  document.title = `${product.name} — SmartCart`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.description.slice(0, 155));

  root.innerHTML = `
    <nav class="breadcrumbs product-detail__crumbs" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span aria-hidden="true">/</span>
      <a href="shop.html">Shop</a><span aria-hidden="true">/</span>
      <a href="shop.html?category=${encodeURIComponent(product.category)}">${escapeHtml(product.category)}</a><span aria-hidden="true">/</span>
      <span>${escapeHtml(product.name)}</span>
    </nav>

    <div class="product-detail__media">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="600" height="600">
      ${onSale ? `<span class="badge badge--sale">Save ${formatPrice(savings)}</span>` : ''}
    </div>

    <div class="product-detail__info">
      <p class="product-card__category">${escapeHtml(product.category)}</p>
      <h1>${escapeHtml(product.name)}</h1>
      <div class="product-detail__rating">${renderStars(product.rating)} <strong>${product.rating.toFixed(1)}</strong> <span class="muted">· ${product.reviews.toLocaleString(CONFIG.LOCALE)} reviews</span></div>

      <div class="price price--lg">
        <span class="price__current">${formatPrice(product.price)}</span>
        ${onSale ? `<span class="price__old">${formatPrice(product.compareAtPrice)}</span>` : ''}
      </div>

      <p class="product-detail__desc">${escapeHtml(product.description)}</p>

      ${highlights.length ? `<ul class="highlights">${highlights.map((item) => `<li>${icons.check(16)} ${escapeHtml(item)}</li>`).join('')}</ul>` : ''}

      <div class="product-detail__stock">${stockLabel(product.stock)} <span class="muted small" id="in-cart-note"></span></div>

      <form class="buy-box" id="buy-form">
        <div class="qty" aria-label="Quantity">
          <button type="button" data-step="-1" aria-label="Decrease quantity">${icons.minus(16)}</button>
          <input type="number" id="qty-input" name="qty" value="1" min="1" max="${max}" inputmode="numeric" aria-label="Quantity" ${outOfStock ? 'disabled' : ''}>
          <button type="button" data-step="1" aria-label="Increase quantity">${icons.plus(16)}</button>
        </div>
        <button type="submit" class="btn btn--primary btn--lg" ${outOfStock ? 'disabled' : ''}>
          ${icons.cart(18)} ${outOfStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </form>

      <ul class="assurances">
        <li>${icons.truck(18)} Free shipping on orders over ${formatPrice(CONFIG.FREE_SHIPPING_THRESHOLD)}</li>
        <li>${icons.refresh(18)} 30-day hassle-free returns</li>
        <li>${icons.shield(18)} 1-year limited warranty</li>
      </ul>
    </div>`;

  bindBuyBox(product);
  updateInCartNote(product);
  onCartChange(() => updateInCartNote(product));
}

function bindBuyBox(product) {
  const form = root.querySelector('#buy-form');
  const input = root.querySelector('#qty-input');
  const max = Math.max(1, maxQuantity(product));

  const setQty = (value) => {
    input.value = String(Math.max(1, Math.min(max, Math.floor(Number(value) || 1))));
    form.querySelector('[data-step="-1"]').disabled = Number(input.value) <= 1 || product.stock <= 0;
    form.querySelector('[data-step="1"]').disabled = Number(input.value) >= max || product.stock <= 0;
  };
  setQty(1);

  form.addEventListener('click', (event) => {
    const step = event.target.closest('[data-step]');
    if (step) setQty(Number(input.value) + Number(step.dataset.step));
  });
  input.addEventListener('change', () => setQty(input.value));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    addProductWithToast(product, Number(input.value));
    setQty(1);
  });
}

function updateInCartNote(product) {
  const note = root.querySelector('#in-cart-note');
  if (!note) return;
  const line = getCart().find((item) => item.id === product.id);
  note.innerHTML = line ? `· ${line.qty} in your <a href="cart.html">cart</a>` : '';
}

function renderRelated(product, products) {
  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, RELATED_LIMIT);
  if (!related.length) return;
  const grid = document.querySelector('#related-grid');
  grid.innerHTML = related.map(productCard).join('');
  bindAddToCart(grid, related);
  document.querySelector('#related').hidden = false;
}

async function init() {
  initLayout();
  try {
    const products = await getProducts();
    const product = products.find((item) => item.id === getQueryParam('id'));
    if (!product) {
      renderNotFound();
      return;
    }
    renderProduct(product);
    renderRelated(product, products);
  } catch (error) {
    root.className = '';
    renderError(root, error.message);
  }
}

init();
