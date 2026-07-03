// ── Shopify state ─────────────────────────────────────────────────────────────
const shopify = {
  domain: localStorage.getItem('shopify_domain') || SHOP_CONFIG.shopifyDomain,
  token:  localStorage.getItem('shopify_token')  || SHOP_CONFIG.storefrontToken,
  client: null,
};
const isLive = () => !!(shopify.domain && shopify.token);

// ── UI state ──────────────────────────────────────────────────────────────────
const ui = {
  images: [],
  filtered: [],
  activeFilter: 'all',
  modal: { image: null, type: 'print', size: '12×12"' },
  cart: [],
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyCollectionMeta();
  await loadImages();
  renderGrid();
  wireEvents();
  updatePreviewBadge();
  if (isLive()) initShopify();
});

function applyCollectionMeta() {
  const { name, tagline, story } = SHOP_CONFIG.collection;
  $('collection-name').textContent  = name;
  $('collection-tagline').textContent = tagline;
  $('story-text').textContent       = story;
}

async function loadImages() {
  const res  = await fetch('../images.json');
  ui.images  = await res.json();
  ui.filtered = ui.images;
  $('count-all').textContent = ui.images.length;
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = $('product-grid');
  grid.innerHTML = '';
  ui.filtered.forEach(fname => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.fname = fname;

    const startingPrice = SHOP_CONFIG.pricing.print['12×12"'];
    card.innerHTML = `
      <img src="../images/${fname}" alt="Fiadh's Faces artwork" loading="lazy">
      <div class="card-overlay">
        <div class="card-price">From $${startingPrice}</div>
        <button class="card-cta">View product</button>
      </div>`;
    card.addEventListener('click', () => openModal(fname));
    grid.appendChild(card);
  });
}

// ── Filter ────────────────────────────────────────────────────────────────────
function wireEvents() {
  // Filter bar
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ui.activeFilter = btn.dataset.filter;
      ui.filtered = ui.images; // All images available in all product types
      renderGrid();
    });
  });

  // Modal close
  $('modal-close').addEventListener('click', closeModal);
  $('modal-overlay').addEventListener('click', e => {
    if (e.target === $('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Product type
  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ui.modal.type = btn.dataset.type;
      refreshModalPrice();
    });
  });

  // Size
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ui.modal.size = btn.dataset.size;
      refreshModalPrice();
    });
  });

  // Add to cart
  $('add-btn').addEventListener('click', handleAddToCart);

  // Shopify config
  $('setup-link').addEventListener('click', e => { e.preventDefault(); $('config-drawer').hidden = false; });
  $('drawer-close').addEventListener('click', () => { $('config-drawer').hidden = true; });
  $('config-save').addEventListener('click', saveShopifyConfig);

  // Cart
  $('cart-btn').addEventListener('click', () => {
    if (!isLive()) { $('config-drawer').hidden = false; return; }
    shopify.client?.checkout?.webUrl && window.open(shopify.client.checkout.webUrl, '_blank');
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(fname) {
  ui.modal.image = fname;
  $('modal-img').src = `../images/${fname}`;
  $('modal-title').textContent = artworkTitle(fname);
  $('modal-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  refreshModalPrice();
  updateAddBtn();
}
function closeModal() {
  $('modal-overlay').hidden = true;
  document.body.style.overflow = '';
}
function artworkTitle(fname) {
  // Generate a readable title from the filename hash
  const words = ['Oval', 'Face', 'Mask', 'Circle', 'Form', 'Portrait', 'Figure', 'Study'];
  const styles = ['in Ink', 'in Gold', 'Abstract', 'Geometric', 'Street', 'Minimal', 'Surreal', 'Teal'];
  const hash = fname.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `${words[hash % words.length]} ${styles[(hash >> 3) % styles.length]} No.${(hash % 90) + 10}`;
}
function refreshModalPrice() {
  const price = SHOP_CONFIG.pricing[ui.modal.type][ui.modal.size];
  $('modal-price').textContent = `$${price}`;
}
function updateAddBtn() {
  const btn = $('add-btn');
  if (isLive()) {
    btn.classList.remove('preview');
    $('add-label').textContent = 'Add to cart';
  } else {
    btn.classList.add('preview');
    $('add-label').textContent = 'Shop coming soon — preview mode';
  }
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function handleAddToCart() {
  if (!isLive()) {
    $('config-drawer').hidden = false;
    return;
  }
  // Shopify Storefront API — add line item
  const productGid = SHOP_CONFIG.productIds[ui.modal.image];
  if (!productGid) {
    alert('This product hasn\'t been mapped to a Shopify product yet.\nAdd it to config.js productIds.');
    return;
  }
  addToShopifyCart(productGid);
}

function updateCartCount() {
  const count = ui.cart.reduce((a, b) => a + b.qty, 0);
  const el = $('cart-count');
  el.hidden = count === 0;
  el.textContent = count;
}

// ── Shopify Storefront API ────────────────────────────────────────────────────
function initShopify() {
  // Dynamically load the Shopify Buy Button SDK
  const script = document.createElement('script');
  script.src = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
  script.onload = () => {
    shopify.client = ShopifyBuy.buildClient({
      domain:                shopify.domain,
      storefrontAccessToken: shopify.token,
    });
    console.log('Shopify client ready');
  };
  document.head.appendChild(script);
}

async function addToShopifyCart(productGid) {
  if (!shopify.client) return;
  try {
    // Fetch product variants
    const product = await shopify.client.product.fetch(productGid);
    const variant  = product.variants[0]; // simplification — pick first variant
    let checkout   = await shopify.client.checkout.create();
    await shopify.client.checkout.addLineItems(checkout.id, [
      { variantId: variant.id, quantity: 1 },
    ]);
    ui.cart.push({ id: variant.id, qty: 1 });
    updateCartCount();
    // Redirect to Shopify checkout
    window.open(checkout.webUrl, '_blank');
  } catch (e) {
    console.error('Shopify error', e);
    alert('Could not add to cart. Check your Shopify configuration.');
  }
}

// ── Shopify config save ───────────────────────────────────────────────────────
async function saveShopifyConfig() {
  const domain = $('cfg-domain').value.trim().replace(/\/$/, '');
  const token  = $('cfg-token').value.trim();
  if (!domain || !token) {
    setConfigStatus('Enter both domain and token', false);
    return;
  }
  // Test connection
  $('config-save').textContent = 'Testing…';
  try {
    const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    setConfigStatus(`Connected to "${data.data.shop.name}"`, true);
    localStorage.setItem('shopify_domain', domain);
    localStorage.setItem('shopify_token', token);
    shopify.domain = domain;
    shopify.token  = token;
    setTimeout(() => { $('config-drawer').hidden = true; updatePreviewBadge(); initShopify(); }, 1500);
  } catch (e) {
    setConfigStatus(`Connection failed: ${e.message}`, false);
  } finally {
    $('config-save').textContent = 'Save & connect';
  }
}

function setConfigStatus(msg, ok) {
  const el = $('config-status');
  el.textContent = ok ? `✓ ${msg}` : `✗ ${msg}`;
  el.className = `config-status ${ok ? 'ok' : 'err'}`;
}

function updatePreviewBadge() {
  $('preview-badge').classList.toggle('hidden', isLive());
}
