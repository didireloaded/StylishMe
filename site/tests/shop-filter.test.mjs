import assert from "node:assert/strict";
import test from "node:test";

const catalog = await import("../app/product-catalog.ts").catch(() => ({}));
const shopFilter = await import("../app/shop-filter.ts").catch(() => ({}));

const getProducts = () => Array.from({ length: 41 }, (_, index) => catalog.buildProduct(index));

const legacySeeds = [
  ["Oversized Coral Hoodie", "Omutima Studio", "Clothing", 899, "Cotton fleece", "Oversized"],
  ["Kalahari Street Sneaker", "Desert Thread", "Shoes", 1299, "Leather and mesh", "True to size"],
  ["Ondelela Evening Dress", "Selma K Couture", "Women", 2450, "Satin blend", "Fitted"],
  ["Swakop Crossbody Bag", "Coastline Atelier", "Bags", 799, "Vegan leather", "Compact"],
  ["Oshiwambo Print Jacket", "Heritage House", "Traditional", 1850, "Cotton print", "Regular"],
  ["Windhoek Utility Shirt", "North 22", "Men", 749, "Cotton twill", "Relaxed"],
  ["Midnight Cargo Trousers", "Street Veld", "Clothing", 999, "Ripstop cotton", "Relaxed"],
  ["Etosha Essential Tee", "Desert Thread", "Clothing", 399, "Organic cotton", "Regular"],
  ["Dune Structured Tote", "Coastline Atelier", "Bags", 1190, "Pebbled leather", "Medium"],
  ["Savanna Tailored Suit", "Mvula Menswear", "Men", 3299, "Wool blend", "Tailored"],
  ["Lilac Ceremony Set", "Selma K Couture", "Traditional", 2190, "Jacquard", "Fitted"],
  ["Walvis Linen Co-ord", "Omutima Studio", "Women", 1399, "Stonewashed linen", "Relaxed"],
];

const identityOf = (product) => ({
  id: product.id,
  name: product.name,
  designer: product.designer,
  location: product.location,
  category: product.category,
  price: product.price,
  oldPrice: product.oldPrice,
  material: product.material,
  fit: product.fit,
});

const legacyIdentityMapping = Array.from({ length: 40 }, (_, index) => {
  const seed = legacySeeds[index % legacySeeds.length];
  const round = Math.floor(index / legacySeeds.length);
  return {
    id: `p${index + 1}`,
    name: round ? `${seed[0]} ${round + 1}` : seed[0],
    designer: seed[1],
    location: ["Windhoek", "Swakopmund", "Ongwediva", "Walvis Bay"][index % 4],
    category: seed[2],
    price: seed[3] + round * 120,
    oldPrice: index % 5 === 1 ? seed[3] + 400 : undefined,
    material: seed[4],
    fit: seed[5],
  };
});

test("preserves every legacy product identity and appends genuine Accessories inventory", () => {
  assert.equal(typeof catalog.buildProduct, "function", "the shared product catalogue builder should exist");
  assert.equal(typeof shopFilter.filterShopProducts, "function", "the Shop filter helper should exist");
  const products = getProducts();
  const seededDesigners = [...new Set(products.map((product) => product.designer))];
  const accessories = shopFilter.filterShopProducts(products, "Accessories", seededDesigners);

  assert.deepEqual(products.slice(0, 40).map(identityOf), legacyIdentityMapping);
  assert.deepEqual(identityOf(products[7]), legacyIdentityMapping[7]);
  assert.deepEqual(accessories.map((product) => product.id), ["p41"]);
  assert.deepEqual(identityOf(products[40]), {
    id: "p41",
    name: "Etosha Woven Belt",
    designer: "Desert Thread",
    location: "Swakopmund",
    category: "Accessories",
    price: 499,
    oldPrice: undefined,
    material: "Woven cotton and leather",
    fit: "Adjustable",
  });
});

test("Sale contains exactly products with a previous price", () => {
  assert.equal(typeof catalog.buildProduct, "function", "the shared product catalogue builder should exist");
  assert.equal(typeof shopFilter.filterShopProducts, "function", "the Shop filter helper should exist");
  const products = getProducts();
  const seededDesigners = [...new Set(products.map((product) => product.designer))];
  const falseSale = { ...products[0], id: "false-sale", category: "Sale", oldPrice: undefined };
  const sale = shopFilter.filterShopProducts([...products, falseSale], "Sale", seededDesigners);

  assert.ok(sale.length > 0);
  assert.deepEqual(
    sale.map((product) => product.id),
    products.filter((product) => product.oldPrice !== undefined).map((product) => product.id),
  );
  assert.ok(!sale.some((product) => product.id === falseSale.id));
});

test("Designer contains seeded designers and rejects non-seeded labels", () => {
  assert.equal(typeof catalog.buildProduct, "function", "the shared product catalogue builder should exist");
  assert.equal(typeof shopFilter.filterShopProducts, "function", "the Shop filter helper should exist");
  const products = getProducts();
  const seededDesigners = [...new Set(products.map((product) => product.designer))];
  const outsider = { ...products[0], id: "outside", category: "Designer", designer: "International Label" };
  const designerProducts = shopFilter.filterShopProducts([...products, outsider], "Designer", seededDesigners);

  assert.ok(designerProducts.length > 0);
  assert.ok(designerProducts.every((product) => seededDesigners.includes(product.designer)));
  assert.ok(!designerProducts.some((product) => product.id === outsider.id));
});

test("Fast delivery selects products with a one-to-two day estimate", () => {
  const products = getProducts();
  const seededDesigners = [...new Set(products.map((product) => product.designer))];
  const fast = shopFilter.filterShopProducts(products, "All", seededDesigners, {
    ...shopFilter.DEFAULT_SHOP_FILTERS,
    delivery: "Fast delivery",
  });

  assert.ok(fast.length > 0);
  assert.ok(fast.every((product) => product.delivery.startsWith("1")));
});

test("catalogue products declare a real seller lane", () => {
  const products = getProducts();
  const lanes = new Set(products.map((product) => product.sellerType));

  assert.deepEqual(lanes, new Set(["Designer", "Brand & boutique", "Merch"]));
  assert.ok(products.filter((product) => product.sellerType === "Designer").every((product) => product.madeLocal || product.madeToOrder));
  assert.ok(products.filter((product) => product.sellerType === "Merch").every((product) => /tee|hoodie/i.test(product.name)));
});

test("every catalogue position has a unique non-generated stock photograph", () => {
  const products = getProducts();
  const images = products.map((product) => product.image);
  assert.equal(new Set(images).size, products.length);
  assert.ok(images.every((image) => image.startsWith("https://images.pexels.com/photos/")));
});
