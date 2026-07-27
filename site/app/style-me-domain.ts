export type StyleBrief = {
  occasion: string; location: string; timing: string; budget: string;
  colours: string[]; style: string; ownedItems: string;
};

type CataloguePiece = {
  id: string; name: string; category: string; price: number; stock: number[];
  location: string; colors: string[]; madeLocal?: boolean; fit?: string; description?: string;
};

const colourTokens: Record<string, string[]> = {
  Black: ["#17171d", "black"], Pastels: ["#f3a4b8", "#988ee8", "#d6b4dd", "lilac", "pink"],
  "Bold colour": ["#f3a4b8", "#83afd9", "coral", "blue"], "Warm neutrals": ["#e9d6bd", "sand", "cream", "brown"],
};

export function createCatalogueLook<T extends CataloguePiece>(products: T[], brief: StyleBrief): T[] {
  const budget = brief.budget === "Flexible" ? Number.POSITIVE_INFINITY : Number(brief.budget.replace(/\D/g, "")) || 1500;
  const categoryOrder = /wedding|dinner|occasion|sunday/i.test(brief.occasion)
    ? ["Women", "Traditional", "Men", "Shoes", "Bags", "Accessories"]
    : /office|work/i.test(brief.occasion)
      ? ["Clothing", "Women", "Men", "Shoes", "Bags", "Accessories"]
      : ["Clothing", "Women", "Men", "Shoes", "Accessories", "Bags"];
  const owned = brief.ownedItems.toLowerCase();
  const excluded = new Set<string>();
  if (/shoe|sneaker|heel|boot/.test(owned)) excluded.add("Shoes");
  if (/bag|tote|handbag/.test(owned)) excluded.add("Bags");
  if (/trouser|pants|jeans|skirt|dress|shirt|top|jacket/.test(owned)) excluded.add("Clothing");
  const desiredColours = brief.colours.flatMap(colour => colourTokens[colour] ?? [colour.toLowerCase()]);
  const available = products.filter(product => product.price > 0 && product.stock.some(quantity => quantity > 0));
  const ranked = [...available].sort((a, b) => {
    const score = (product: T) => {
      let value = Math.max(0, 20 - categoryOrder.indexOf(product.category) * 2);
      if (!categoryOrder.includes(product.category)) value = 0;
      if (product.location.toLowerCase().includes(brief.location.toLowerCase())) value += 4;
      if (product.madeLocal) value += 2;
      const searchable = `${product.colors.join(" ")} ${product.name} ${product.description ?? ""}`.toLowerCase();
      if (desiredColours.some(colour => searchable.includes(colour.toLowerCase()))) value += 3;
      if (brief.style && searchable.includes(brief.style.toLowerCase())) value += 2;
      return value;
    };
    return score(b) - score(a) || categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.price - b.price;
  });
  const picked: T[] = []; let total = 0;
  for (const category of categoryOrder) {
    if (excluded.has(category)) continue;
    const choice = ranked.find(product => product.category === category && !picked.includes(product) && total + product.price <= budget);
    if (!choice) continue;
    picked.push(choice); total += choice.price;
    if (picked.length === 4) break;
  }
  return picked;
}
