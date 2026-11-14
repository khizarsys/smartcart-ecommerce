import { getProducts } from '../store.js';
import { getCartLines, calculateTotals, updateQuantity, removeFromCart, clearCart, onCartChange } from '../cart.js';
import { CONFIG } from '../config.js';
import { initLayout, renderError, formatPrice, escapeHtml, icons, showToast } from '../ui.js';
import { orderSummaryHtml } from '../summary.js';

const root = document.querySelector('#cart-root');
let products = [];

function renderEmpty() {
  root.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__icon">${icons.cart(28)}</span>
      <h2>Your cart is empty</h2>
      <p class="muted">Looks like you haven't added anything yet. Explore the catalog to find something you'll love.</p>
      <a class="btn btn--primary" href="shop.html">Start shopping</a>
    </div>`;
}

function lineHtml({ product, qty, lineTotal }) {
  const max = Math.max(1, Math.min(CONFIG.MAX_QTY_PER_ITEM, product.stock));
  const url = `product.html?id=${encodeURIComponent(product.id)}`;
  return `
    <li class="cart-line" data-id="${escapeHtml(product.id)}">
      <a href="${url}" class="cart-line__img"><img src="${escapeHtml(product.image)}" alt="" width="600" height="600"></a>
      <div class="cart-line__info">
        <a href="${url}" class="cart-line__name">${escapeHtml(product.name)}</a>
        <span class="muted small">${escapeHtml(product.category)} · ${formatPrice(product.price)} each</span>
        ${product.stock <= 0 ? '<span class="badge badge--danger">No longer in stock</span>' : ''}
      </div>
      <div class="qty" aria-label="Quantity for ${escapeHtml(product.name)}">
        <button type="button" data-action="dec" aria-label="Decrease quantity" ${qty <= 1 ? 'disabled' : ''}>${icons.minus(16)}</button>
        <input type="number" value="${qty}" min="1" max="${max}" inputmode="numeric" aria-label="Quantity" data-action="set">
        <button type="button" data-action="inc" aria-label="Increase quantity" ${qty >= max ? 'disabled' : ''}>${icons.plus(16)}</button>
      </div>
      <strong class="cart-line__total">${formatPrice(lineTotal)}</strong>
      <button type="button" class="btn btn--ghost btn--icon btn--sm cart-line__remove" data-action="remove" aria-label="Remove ${escapeHtml(product.name)}">${icons.trash(18)}</button>
    </li>`;
}

function render() {
  const lines = getCartLines(products);
  if (!lines.length) {
    renderEmpty();
    return;
  }
  const totals = calculateTotals(lines);
  const hasUnavailable = lines.some((line) => line.product.stock <= 0);

  root.innerHTML = `
    <div class="cart-layout">
      <section class="panel" aria-label="Cart items">
        <div class="cart-head">
          <h2>${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'}</h2>
          <button type="button" class="btn btn--ghost btn--sm" data-action="clear">Clear cart</button>
        </div>
        <ul class="cart-lines">${lines.map(lineHtml).join('')}</ul>
        <a href="shop.html" class="btn btn--ghost">← Continue shopping</a>
      </section>

      <aside class="panel summary" aria-label="Order summary">
        ${orderSummaryHtml(totals)}
        ${hasUnavailable ? '<p class="form-alert">Remove out-of-stock items to continue to checkout.</p>' : ''}
        ${
          hasUnavailable
            ? '<button class="btn btn--primary btn--lg btn--block" disabled>Proceed to checkout</button>'
            : '<a href="checkout.html" class="btn btn--primary btn--lg btn--block">Proceed to checkout</a>'
        }
        <p class="muted small summary__secure">${icons.lock(14)} Secure checkout · Demo store, no real payment</p>
      </aside>
    </div>`;
}

function findProduct(id) {
  return products.find((product) => product.id === id);
}

function bindEvents() {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'clear') {
      if (window.confirm('Remove all items from your cart?')) {
        clearCart();
        showToast('Your cart has been cleared.', 'info');
      }
      return;
    }

    const line = button.closest('.cart-line');
    const product = line && findProduct(line.dataset.id);
    if (!product) return;
    const current = Number(line.querySelector('input').value);

    if (action === 'inc') updateQuantity(product.id, current + 1, product.stock);
    if (action === 'dec') updateQuantity(product.id, current - 1, product.stock);
    if (action === 'remove') {
      removeFromCart(product.id);
      showToast(`Removed ${product.name} from your cart.`, 'info');
    }
  });

  root.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-action="set"]');
    if (!input) return;
    const product = findProduct(input.closest('.cart-line').dataset.id);
    if (product) updateQuantity(product.id, input.value, product.stock);
  });

  // Every cart mutation (here or in another tab) re-renders the page.
  onCartChange(render);
}

async function init() {
  initLayout();
  try {
    products = await getProducts();
    render();
    bindEvents();
  } catch (error) {
    renderError(root, error.message);
  }
}

init();
