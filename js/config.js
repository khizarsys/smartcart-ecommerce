/**
 * Global configuration for SmartCart.
 *
 * DEMO NOTICE: SmartCart is a static, client-side demo. The admin password below
 * is intentionally public so reviewers can try the admin panel. It is NOT a secret
 * and offers no real security — a production build would authenticate on a server.
 */
export const CONFIG = Object.freeze({
  STORE_NAME: 'SmartCart',
  CURRENCY: 'USD',
  LOCALE: 'en-US',

  // Demo-only credential (see notice above).
  ADMIN_DEMO_PASSWORD: 'admin123',

  TAX_RATE: 0.08,
  SHIPPING_FEE: 7.99,
  FREE_SHIPPING_THRESHOLD: 75,
  MAX_QTY_PER_ITEM: 10,

  PRODUCTS_URL: 'data/products.json',

  STORAGE_KEYS: Object.freeze({
    PRODUCTS: 'smartcart:products',
    CART: 'smartcart:cart',
    ORDERS: 'smartcart:orders',
    THEME: 'smartcart:theme',
    ADMIN_SESSION: 'smartcart:admin-session',
    LAST_ORDER: 'smartcart:last-order',
  }),
});
