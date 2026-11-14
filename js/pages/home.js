import { getProducts, getCategories } from '../store.js';
import { initLayout, productCard, bindAddToCart, renderError, escapeHtml, icons, formatPrice } from '../ui.js';
import { CONFIG } from '../config.js';

const FEATURED_LIMIT = 8;

const PERKS = [
  { icon: icons.truck, title: 'Free shipping', text: `On orders over ${formatPrice(CONFIG.FREE_SHIPPING_THRESHOLD)}` },
  { icon: icons.refresh, title: '30-day returns', text: 'No questions asked' },
  { icon: icons.shield, title: 'Secure checkout', text: 'Your data stays safe' },
  { icon: icons.check, title: 'Quality guaranteed', text: 'Curated, tested products' },
];

function renderPerks() {
  document.querySelector('#perks').innerHTML = PERKS.map(
    (perk) => `
      <div class="perk">
        <span class="perk__icon">${perk.icon(22)}</span>
        <div><strong>${perk.title}</strong><p class="muted small">${perk.text}</p></div>
      </div>`
  ).join('');
}

function renderHeroVisual(products) {
  const picks = products.filter((product) => product.featured).slice(0, 3);
  const visual = document.querySelector('#hero-visual');
  visual.insertAdjacentHTML(
    'beforeend',
    picks
      .map(
        (product, index) => `
        <figure class="hero__tile hero__tile--${index + 1}">
          <img src="${escapeHtml(product.image)}" alt="" width="600" height="600">
          <figcaption><span>${escapeHtml(product.name)}</span><strong>${formatPrice(product.price)}</strong></figcaption>
        </figure>`
      )
      .join('')
  );
}

function renderCategories(categories) {
  document.querySelector('#category-grid').innerHTML = categories
    .map(
      (category) => `
      <a class="category-card" href="shop.html?category=${encodeURIComponent(category.name)}">
        <img src="assets/images/categories/${category.slug}.svg" alt="" loading="lazy" width="600" height="600">
        <div class="category-card__label">
          <strong>${escapeHtml(category.name)}</strong>
          <span>${category.count} product${category.count === 1 ? '' : 's'}</span>
        </div>
      </a>`
    )
    .join('');
}

function renderFeatured(products) {
  const grid = document.querySelector('#featured-grid');
  const featured = products.filter((product) => product.featured);
  // Fall back to top-rated items if an admin un-featured everything.
  const list = (featured.length ? featured : [...products].sort((a, b) => b.rating - a.rating)).slice(0, FEATURED_LIMIT);
  grid.innerHTML = list.map(productCard).join('');
  bindAddToCart(grid, list);
}

async function init() {
  initLayout();
  renderPerks();
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    renderHeroVisual(products);
    renderCategories(categories);
    renderFeatured(products);
  } catch (error) {
    renderError(document.querySelector('#featured-grid'), error.message);
    document.querySelector('#category-grid').innerHTML = '';
  }
}

init();
