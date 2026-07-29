import type { Product } from "./product-catalog";

type PublicVariant = { size?: unknown; colour?: unknown; quantity?: unknown };
type PublicProduct = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  price?: unknown;
  images?: unknown;
  material?: unknown;
  fit?: unknown;
  delivery?: unknown;
  variants?: unknown;
  store?: unknown;
};

const colourHex: Record<string, string> = {
  black: "#17171d",
  white: "#f4f1eb",
  sand: "#e9d6bd",
  beige: "#d9c7ad",
  brown: "#7c5845",
  blue: "#83afd9",
  navy: "#263750",
  pink: "#f3a4b8",
  coral: "#ee8c82",
  lilac: "#988ee8",
  purple: "#8c67a8",
  green: "#70ae8f",
  red: "#b54b4b",
  yellow: "#d8b84b",
  grey: "#8b8d91",
  gray: "#8b8d91",
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function toCustomerProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null;
  const input = value as PublicProduct;
  const store = input.store && typeof input.store === "object" ? input.store as Record<string, unknown> : {};
  const id = text(input.id);
  const name = text(input.name);
  const designer = text(store.name);
  const category = text(input.category);
  const price = Number(input.price);
  const images = Array.isArray(input.images) ? input.images.filter((image): image is string => typeof image === "string" && image.length > 0) : [];
  if (!id || !name || !designer || !category || !Number.isFinite(price) || price <= 0 || !images.length) return null;

  const variants = Array.isArray(input.variants) ? input.variants as PublicVariant[] : [];
  const sizeStock = new Map<string, number>();
  const colours: string[] = [];
  for (const variant of variants) {
    const size = text(variant.size);
    const colour = text(variant.colour);
    const quantity = Math.max(0, Math.floor(Number(variant.quantity) || 0));
    if (!size || !colour) continue;
    sizeStock.set(size, (sizeStock.get(size) ?? 0) + quantity);
    if (!colours.includes(colour)) colours.push(colour);
  }
  if (!sizeStock.size) return null;
  const deliveryMethods = Array.isArray(input.delivery)
    ? input.delivery.filter((method): method is string => typeof method === "string")
    : [];
  const storeType = text(store.type).toLowerCase();
  const sellerType: Product["sellerType"] = storeType.includes("merch")
    ? "Merch"
    : storeType.includes("designer")
      ? "Designer"
      : "Brand & boutique";
  const sizes = Array.from(sizeStock.keys());
  return {
    id,
    name,
    designer,
    location: text(store.city) || "Namibia",
    category,
    price,
    image: images[0],
    badge: "New from a local store",
    material: text(input.material) || "See product details",
    fit: text(input.fit) || "See fit guidance",
    description: text(input.description),
    colors: colours.map((colour) => colourHex[colour.toLowerCase()] ?? "#e9d6bd"),
    sizes,
    stock: sizes.map((size) => sizeStock.get(size) ?? 0),
    delivery: deliveryMethods.length ? deliveryMethods.join(" · ") : "Delivery options shown at checkout",
    pickup: deliveryMethods.some((method) => /collection|pickup/i.test(method)),
    madeLocal: sellerType === "Designer",
    sellerType,
  };
}

export function mergeCustomerCatalogue(seeded: Product[], remote: unknown) {
  const live = Array.isArray(remote) ? remote.map(toCustomerProduct).filter((product): product is Product => Boolean(product)) : [];
  const byId = new Map(seeded.map((product) => [product.id, product]));
  for (const product of live) byId.set(product.id, product);
  return Array.from(byId.values());
}
