import { getProducts, saveProducts, saveOrder, createOrderId } from '../store.js';
import { getCartLines, calculateTotals, clearCart, onCartChange } from '../cart.js';
import { initLayout, renderError, formatPrice, escapeHtml, icons, showToast } from '../ui.js';
import { orderSummaryHtml } from '../summary.js';
import { rules, createValidator } from '../validation.js';

const root = document.querySelector('#checkout-root');
const form = document.querySelector('#checkout-form');
const summary = document.querySelector('#checkout-summary');

let products = [];
let placingOrder = false;

const schema = {
  fullName: [rules.required('Full name'), rules.minLength('Full name', 3)],
  email: [rules.required('Email address'), rules.email],
  phone: [rules.required('Phone number'), rules.phone],
  address: [rules.required('Street address'), rules.minLength('Street address', 5)],
  city: [rules.required('City'), rules.minLength('City', 2)],
  postalCode: [rules.required('Postal code'), rules.postalCode],
  country: [rules.required('Country')],
  terms: [rules.checked('Please accept the terms to place your order.')],
};

function renderEmpty() {
  root.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__icon">${icons.cart(28)}</span>
      <h2>Your cart is empty</h2>
      <p class="muted">Add a few products before checking out.</p>
      <a class="btn btn--primary" href="shop.html">Browse products</a>
    </div>`;
}

function renderSummary() {
  const lines = getCartLines(products);
  if (!lines.length) {
    if (!placingOrder) renderEmpty();
    return null;
  }
  const totals = calculateTotals(lines);
  summary.innerHTML = `
    <ul class="mini-lines">
      ${lines
        .map(
          ({ product, qty, lineTotal }) => `
        <li>
          <span class="mini-lines__img"><img src="${escapeHtml(product.image)}" alt="" width="600" height="600"><span class="mini-lines__qty">${qty}</span></span>
          <span class="mini-lines__name">${escapeHtml(product.name)}</span>
          <strong>${formatPrice(lineTotal)}</strong>
        </li>`
        )
        .join('')}
    </ul>
    ${orderSummaryHtml(totals)}
    <button type="submit" form="checkout-form" class="btn btn--primary btn--lg btn--block" id="place-order">
      ${icons.lock(18)} Place order · ${formatPrice(totals.total)}
    </button>
    <a href="cart.html" class="btn btn--ghost btn--block">Edit cart</a>`;
  return { lines, totals };
}

/** Confirms every line is still purchasable (stock may have changed in the admin panel). */
function findStockProblems(lines) {
  return lines.filter(({ product, qty }) => product.stock < qty).map(({ product }) => product.name);
}

function placeOrder(values) {
  const lines = getCartLines(products);
  if (!lines.length) {
    renderEmpty();
    return;
  }
  const problems = findStockProblems(lines);
  if (problems.length) {
    showToast(`Not enough stock for: ${problems.join(', ')}. Please update your cart.`, 'error');
    return;
  }

  placingOrder = true;
  const totals = calculateTotals(lines);
  const order = {
    id: createOrderId(),
    createdAt: new Date().toISOString(),
    status: 'Processing',
    customer: {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      postalCode: values.postalCode.trim(),
      country: values.country,
    },
    payment: values.payment,
    notes: (values.notes || '').trim(),
    // Snapshot product details so the order stays accurate if the catalog changes later.
    items: lines.map(({ product, qty, lineTotal }) => ({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      qty,
      lineTotal,
    })),
    totals,
  };

  saveOrder(order);

  // Reduce stock for purchased items.
  const purchased = new Map(lines.map(({ product, qty }) => [product.id, qty]));
  saveProducts(products.map((product) => (purchased.has(product.id) ? { ...product, stock: product.stock - purchased.get(product.id) } : product)));

  clearCart();
  window.location.replace(`thank-you.html?order=${encodeURIComponent(order.id)}`);
}

async function init() {
  initLayout();
  try {
    products = await getProducts();
  } catch (error) {
    renderError(root, error.message);
    return;
  }

  if (!renderSummary()) return;
  onCartChange(renderSummary);

  const validator = createValidator(form, schema);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (placingOrder) return;
    if (!validator.validateAll()) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }
    placeOrder(validator.values());
  });
}

init();
