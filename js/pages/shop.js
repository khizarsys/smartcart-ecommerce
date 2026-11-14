import { getProducts, getCategories } from '../store.js';
import { initLayout, productCard, bindAddToCart, renderError, escapeHtml, icons } from '../ui.js';

const ALL = 'all';
const SORTERS = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  name: (a, b) => a.name.localeCompare(b.name),
};

const els = {
  form: document.querySelector('#shop-filters'),
  search: document.querySelector('#filter-search'),
  sort: document.querySelector('#filter-sort'),
  stock: document.querySelector('#filter-stock'),
  chips: document.querySelector('#category-chips'),
  grid: document.querySelector('#product-grid'),
  count: document.querySelector('#result-count'),
  clear: document.querySelector('#clear-filters'),
};

let products = [];
const state = { q: '', category: ALL, sort: 'featured', inStock: false };

/** Reads filter state from the URL so filtered views are shareable. */
function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.q = params.get('q') || '';
  state.category = params.get('category') || ALL;
  state.sort = SORTERS[params.get('sort')] ? params.get('sort') : 'featured';
  state.inStock = params.get('inStock') === '1';
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category !== ALL) params.set('category', state.category);
  if (state.sort !== 'featured') params.set('sort', state.sort);
  if (state.inStock) params.set('inStock', '1');
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

function syncControls() {
  els.search.value = state.q;
  els.sort.value = state.sort;
  els.stock.checked = state.inStock;
  els.chips.querySelectorAll('[data-category]').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.category === state.category));
  });
  const headerSearch = document.querySelector('.header-search input');
  if (headerSearch) headerSearch.value = state.q;
}

function filterProducts() {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  return products
    .filter((product) => state.category === ALL || product.category === state.category)
    .filter((product) => !state.inStock || product.stock > 0)
    .filter((product) => {
      if (!terms.length) return true;
      const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort(SORTERS[state.sort]);
}

function render() {
  const results = filterProducts();
  const filtered = state.q || state.category !== ALL || state.inStock;
  els.clear.hidden = !filtered;
  els.count.textContent = `Showing ${results.length} of ${products.length} product${products.length === 1 ? '' : 's'}`;

  if (!results.length) {
    els.grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__icon">${icons.search(28)}</span>
        <h2>No products found</h2>
        <p class="muted">${state.q ? `Nothing matches “${escapeHtml(state.q)}”. ` : ''}Try a different search term or category.</p>
        <button type="button" class="btn btn--primary" data-clear>Clear filters</button>
      </div>`;
    return;
  }
  els.grid.innerHTML = results.map(productCard).join('');
}

function renderChips(categories) {
  const chips = [{ name: ALL, label: 'All', count: products.length }, ...categories.map((c) => ({ ...c, label: c.name }))];
  els.chips.innerHTML = chips
    .map(
      (chip) =>
        `<button type="button" class="chip" data-category="${escapeHtml(chip.name)}" aria-pressed="false">${escapeHtml(chip.label)} <span>${chip.count}</span></button>`
    )
    .join('');
}

function update(patch) {
  Object.assign(state, patch);
  writeStateToUrl();
  syncControls();
  render();
}

function clearFilters() {
  update({ q: '', category: ALL, inStock: false });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function bindEvents() {
  els.form.addEventListener('submit', (event) => event.preventDefault());
  els.search.addEventListener('input', debounce(() => update({ q: els.search.value.trim() }), 200));
  els.sort.addEventListener('change', () => update({ sort: els.sort.value }));
  els.stock.addEventListener('change', () => update({ inStock: els.stock.checked }));
  els.chips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (chip) update({ category: chip.dataset.category });
  });
  els.clear.addEventListener('click', clearFilters);
  els.grid.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear]')) clearFilters();
  });
  bindAddToCart(els.grid, () => products);

  // The header search submits to shop.html; on this page handle it in place.
  const headerForm = document.querySelector('.header-search');
  headerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    update({ q: headerForm.querySelector('input').value.trim() });
  });
}

async function init() {
  initLayout();
  readStateFromUrl();
  try {
    const [loaded, categories] = await Promise.all([getProducts(), getCategories()]);
    products = loaded;
    // Ignore unknown categories in the URL.
    if (state.category !== ALL && !categories.some((c) => c.name === state.category)) state.category = ALL;
    renderChips(categories);
    syncControls();
    render();
    bindEvents();
  } catch (error) {
    els.count.textContent = '';
    renderError(els.grid, error.message);
  }
}

init();
