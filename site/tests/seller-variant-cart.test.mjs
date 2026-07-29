import assert from "node:assert/strict";
import test from "node:test";

import { cartLineForSelection } from "../app/cart-commerce.ts";
import { toCustomerProduct } from "../app/customer-catalogue.ts";

test("seller colour and size selections retain their authoritative variant id in the cart", () => {
  const product = toCustomerProduct({
    id: "seller:shirt",
    name: "Linen Shirt",
    description: "A long-form product description suitable for a real seller listing.",
    category: "Clothing",
    price: 850,
    images: ["/api/seller-images/shirt.webp"],
    store: { name: "Coastline Atelier", city: "Swakopmund", type: "Designer" },
    variants: [
      { id: "variant-sand-m", size: "M", colour: "Sand", quantity: 2 },
      { id: "variant-black-m", size: "M", colour: "Black", quantity: 1 },
    ],
  });
  assert.ok(product);
  const black = product.variantOptions.find((variant) => variant.variantId === "variant-black-m");
  const line = cartLineForSelection(product, "M", black.displayColor, 1);

  assert.equal(line.variantId, "variant-black-m");
  assert.equal(line.color, black.displayColor);
});
