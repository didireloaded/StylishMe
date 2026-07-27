export type ShopFilterProduct = {
  category: string;
  designer: string;
  location: string;
  price: number;
  oldPrice?: number;
  colors: string[];
  sizes: string[];
  stock: number[];
  delivery: string;
  pickup: boolean;
};

export type ShopFilterState = {
  size: string;
  color: string;
  price: string;
  designer: string;
  location: string;
  delivery: string;
};

export const DEFAULT_SHOP_FILTERS: ShopFilterState = {
  size: "Any size",
  color: "Any colour",
  price: "Any price",
  designer: "Any designer",
  location: "Any location",
  delivery: "Any delivery",
};

function matchesPrice(price: number, priceFilter: string) {
  if (priceFilter === "Under N$800") return price < 800;
  if (priceFilter === "N$800 to N$1,500") return price >= 800 && price <= 1_500;
  if (priceFilter === "Over N$1,500") return price > 1_500;
  return true;
}

export function filterShopProducts<T extends ShopFilterProduct>(
  products: readonly T[],
  category: string,
  seededDesignerNames: readonly string[],
  filters: ShopFilterState = DEFAULT_SHOP_FILTERS,
): T[] {
  return products.filter((product) => {
    const matchesCategory = category === "All"
      ? true
      : category === "Sale"
        ? product.oldPrice !== undefined
        : category === "Designer"
          ? seededDesignerNames.includes(product.designer)
          : product.category === category;
    const sizeIndex = product.sizes.indexOf(filters.size);
    const matchesSize = filters.size === DEFAULT_SHOP_FILTERS.size
      || (sizeIndex >= 0 && product.stock[sizeIndex] > 0);
    const matchesColor = filters.color === DEFAULT_SHOP_FILTERS.color
      || product.colors.includes(filters.color);
    const matchesDesigner = filters.designer === DEFAULT_SHOP_FILTERS.designer
      || product.designer === filters.designer;
    const matchesLocation = filters.location === DEFAULT_SHOP_FILTERS.location
      || product.location === filters.location;
    const matchesDelivery = filters.delivery === DEFAULT_SHOP_FILTERS.delivery
      || (filters.delivery === "Nationwide" && product.delivery.toLowerCase().includes("nationwide"))
      || (filters.delivery === "Store collection" && product.pickup)
      || (filters.delivery === "Fast delivery" && /^1\D+2 days/i.test(product.delivery));

    return matchesCategory
      && matchesSize
      && matchesColor
      && matchesPrice(product.price, filters.price)
      && matchesDesigner
      && matchesLocation
      && matchesDelivery;
  });
}
