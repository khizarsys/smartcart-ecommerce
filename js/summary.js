/** Order totals markup shared by the cart, checkout and thank-you pages. */
import { CONFIG } from './config.js';
import { formatPrice } from './ui.js';

export function orderSummaryHtml(totals, { title = 'Order summary', showMeter = true } = {}) {
  const remaining = CONFIG.FREE_SHIPPING_THRESHOLD - totals.subtotal;
  const progress = Math.min(100, (totals.subtotal / CONFIG.FREE_SHIPPING_THRESHOLD) * 100);

  return `
    <h2>${title}</h2>
    <dl class="totals">
      <div><dt>Subtotal</dt><dd>${formatPrice(totals.subtotal)}</dd></div>
      <div><dt>Shipping</dt><dd>${totals.shipping === 0 ? '<span class="text-success">Free</span>' : formatPrice(totals.shipping)}</dd></div>
      <div><dt>Estimated tax (${Math.round(CONFIG.TAX_RATE * 100)}%)</dt><dd>${formatPrice(totals.tax)}</dd></div>
      <div class="totals__grand"><dt>Total</dt><dd>${formatPrice(totals.total)}</dd></div>
    </dl>
    ${
      !showMeter
        ? ''
        : remaining > 0
        ? `<div class="shipping-meter">
            <p class="small">Add <strong>${formatPrice(remaining)}</strong> more for free shipping.</p>
            <div class="shipping-meter__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}" aria-label="Progress to free shipping"><span style="width:${progress}%"></span></div>
          </div>`
        : '<p class="small text-success shipping-meter">You\'ve unlocked free shipping.</p>'
    }`;
}
