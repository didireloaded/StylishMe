import { getSizeStock, type CartLine } from "./cart-commerce";
import { buildProduct } from "./product-catalog";

export const FULFILMENT_METHODS = ["Standard delivery", "Express delivery", "Store collection"] as const;

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}
export type FulfilmentMethod = typeof FULFILMENT_METHODS[number];

export type SandboxOrderDraft = {
  fulfilment: FulfilmentMethod;
  items: CartLine[];
  status: "Order confirmed" | "Preparing for collection";
  total: number;
};

const catalogue = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const productById = new Map(catalogue.map(product => [product.id, product]));

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return typeof line.productId === "string"
    && typeof line.size === "string"
    && typeof line.color === "string"
    && Number.isInteger(line.quantity)
    && Number(line.quantity) > 0;
}

export function isFulfilmentMethod(value: unknown): value is FulfilmentMethod {
  return typeof value === "string" && (FULFILMENT_METHODS as readonly string[]).includes(value);
}

export function prepareSandboxOrder(cart: unknown, fulfilment: unknown): SandboxOrderDraft {
  if (!isFulfilmentMethod(fulfilment)) throw new OrderValidationError("Choose a delivery or collection option");
  if (!Array.isArray(cart) || !cart.length) throw new OrderValidationError("Your bag is empty");

  let subtotal = 0;
  const lines: CartLine[] = [];
  const quantities = new Map<string, number>();
  for (const value of cart) {
    if (!isCartLine(value)) throw new OrderValidationError("Your bag contains an invalid item");
    const product = productById.get(value.productId);
    if (!product || !product.sizes.includes(value.size) || !product.colors.includes(value.color)) {
      throw new OrderValidationError("A bag item is no longer available");
    }
    const key = `${value.productId}:${value.size}:${value.color}`;
    const quantity = (quantities.get(key) ?? 0) + value.quantity;
    if (quantity > getSizeStock(product, value.size)) throw new OrderValidationError(`${product.name} no longer has enough stock`);
    quantities.set(key, quantity);
    lines.push({ productId: product.id, size: value.size, color: value.color, quantity: value.quantity });
    subtotal += product.price * value.quantity;
  }

  const deliveryFee = fulfilment === "Store collection" ? 0 : fulfilment === "Express delivery" ? 120 : 65;
  return {
    fulfilment,
    items: lines,
    status: fulfilment === "Store collection" ? "Preparing for collection" : "Order confirmed",
    total: subtotal + deliveryFee,
  };
}
