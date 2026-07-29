import type { Product } from "./product-catalog";

export type CartLine = {
  productId: string;
  variantId?: string;
  size: string;
  color: string;
  quantity: number;
};

export type CartMergeResult = {
  lines: CartLine[];
  added: number;
  capped: number;
  invalid: number;
};

export function getSizeStock(product: Pick<Product, "sizes" | "stock">, size: string) {
  const index = product.sizes.indexOf(size);
  return index < 0 ? 0 : product.stock[index] ?? 0;
}

export function getFirstStockedSize(product: Pick<Product, "sizes" | "stock">) {
  const index = product.stock.findIndex((quantity) => quantity > 0);
  return index < 0 ? null : product.sizes[index];
}

export function cartLineForSelection(product: Product, size: string, color: string, quantity = 1): CartLine | null {
  if (product.variantOptions?.length) {
    const variant = product.variantOptions.find((option) => option.size === size && option.displayColor === color && option.stock >= quantity);
    if (!variant) return null;
    return { productId: product.id, variantId: variant.variantId, size, color, quantity };
  }
  return product.sizes.includes(size) && product.colors.includes(color)
    ? { productId: product.id, size, color, quantity }
    : null;
}

export function mergeCartLinesWithinStock(
  current: readonly CartLine[],
  requested: readonly CartLine[],
  productById: ReadonlyMap<string, Product>,
): CartMergeResult {
  let lines = current.map((line) => ({ ...line }));
  let added = 0;
  let capped = 0;
  let invalid = 0;

  for (const request of requested) {
    const product = productById.get(request.productId);
    const variant = request.variantId
      ? product?.variantOptions?.find((option) => option.variantId === request.variantId
        && option.size === request.size && option.displayColor === request.color)
      : undefined;
    if (!product || !product.colors.includes(request.color) || !product.sizes.includes(request.size)
      || (request.variantId && !variant) || (product.variantOptions?.length && !request.variantId)) {
      invalid += request.quantity;
      continue;
    }

    const stock = variant?.stock ?? getSizeStock(product, request.size);
    const matchIndex = lines.findIndex((line) => line.productId === request.productId
      && line.size === request.size
      && line.color === request.color
      && line.variantId === request.variantId);
    const existing = matchIndex >= 0 ? lines[matchIndex].quantity : 0;
    const quantityToAdd = Math.max(0, Math.min(request.quantity, stock - existing));
    const quantityCapped = request.quantity - quantityToAdd;

    if (quantityToAdd > 0) {
      if (matchIndex >= 0) {
        lines[matchIndex] = { ...lines[matchIndex], quantity: existing + quantityToAdd };
      } else {
        lines = [...lines, { ...request, quantity: quantityToAdd }];
      }
      added += quantityToAdd;
    }
    capped += quantityCapped;
  }

  return { lines, added, capped, invalid };
}
