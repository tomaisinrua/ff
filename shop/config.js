// ── Shopify + POD configuration ────────────────────────────────────────────────
// Fill these in once your Shopify store + Printful/Printify is live.
// Until then the shop runs in preview mode (no cart, shows pricing).

const SHOP_CONFIG = {
  // Your Shopify store domain, e.g. 'fiadhs-faces.myshopify.com'
  shopifyDomain: '',

  // Shopify Storefront API public access token (from Shopify Admin → Apps → Storefront API)
  storefrontToken: '',

  // Map image filename → Shopify product GID (fill in as you create products)
  // e.g. 'edited_file-xxx.jpeg': 'gid://shopify/Product/1234567890'
  productIds: {},

  // Pricing table (USD) — update to match your Printful/Printify costs + margin
  pricing: {
    print:  { '8×8"': 29,  '12×12"': 45,  '16×16"': 60,  '20×20"': 80,  '24×24"': 105 },
    canvas: { '8×8"': 55,  '12×12"': 75,  '16×16"': 100, '20×20"': 130, '24×24"': 165 },
    poster: { '8×8"': 20,  '12×12"': 32,  '16×16"': 42,  '20×20"': 58,  '24×24"': 72  },
  },

  // Collection metadata
  collection: {
    name:    "Fiadh's Faces",
    tagline: 'Original AI art from the first moments of a life',
    story:   "Each piece in this collection began as a photograph taken in the days after Fiadh was born. Using Stable Diffusion, those images were transformed into works of art — abstract faces, ink paintings, street art, geometric masks — each one a different way of seeing the same extraordinary new person.",
  },
};
