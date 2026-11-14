import { getOrderById, getLastOrderId } from '../store.js';
import { initLayout, formatPrice, formatDate, escapeHtml, getQueryParam, icons } from '../ui.js';
import { orderSummaryHtml } from '../summary.js';

const root = document.querySelector('#thanks-root');

function renderMissing() {
  root.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__icon">${icons.search(28)}</span>
      <h2>Order not found</h2>
      <p class="muted">We couldn't find that order on this device. Orders are stored in your browser.</p>
      <a class="btn btn--primary" href="shop.html">Continue shopping</a>
    </div>`;
}

function render(order) {
  const { customer } = order;
  const firstName = customer.fullName.split(' ')[0];

  root.innerHTML = `
    <section class="thanks__hero">
      <span class="thanks__check">${icons.check(36)}</span>
      <h1>Thank you, ${escapeHtml(firstName)}!</h1>
      <p class="muted">Your order <strong class="order-id">${escapeHtml(order.id)}</strong> has been placed on ${formatDate(order.createdAt)}.
      A confirmation would be sent to <strong>${escapeHtml(customer.email)}</strong> in a real store.</p>
      <div class="hero__actions thanks__actions">
        <a href="shop.html" class="btn btn--primary">Continue shopping</a>
        <button type="button" class="btn btn--outline" id="print-order">Print receipt</button>
      </div>
    </section>

    <div class="cart-layout">
      <section class="panel">
        <h2>Items ordered</h2>
        <ul class="mini-lines">
          ${order.items
            .map(
              (item) => `
            <li>
              <span class="mini-lines__img"><img src="${escapeHtml(item.image)}" alt="" width="600" height="600"><span class="mini-lines__qty">${item.qty}</span></span>
              <span class="mini-lines__name">${escapeHtml(item.name)}<span class="muted small">${formatPrice(item.price)} each</span></span>
              <strong>${formatPrice(item.lineTotal)}</strong>
            </li>`
            )
            .join('')}
        </ul>
        <div class="order-details">
          <div>
            <h3>Shipping to</h3>
            <p class="muted">${escapeHtml(customer.fullName)}<br>${escapeHtml(customer.address)}<br>${escapeHtml(customer.city)}, ${escapeHtml(customer.postalCode)}<br>${escapeHtml(customer.country)}</p>
          </div>
          <div>
            <h3>Payment</h3>
            <p class="muted">${escapeHtml(order.payment)}</p>
            <h3>Status</h3>
            <p><span class="badge badge--info">${escapeHtml(order.status)}</span></p>
          </div>
        </div>
      </section>
      <aside class="panel summary">${orderSummaryHtml(order.totals, { title: 'Payment summary', showMeter: false })}</aside>
    </div>`;

  root.querySelector('#print-order').addEventListener('click', () => window.print());
}

function init() {
  initLayout();
  const order = getOrderById(getQueryParam('order') || getLastOrderId());
  if (order) render(order);
  else renderMissing();
}

init();
