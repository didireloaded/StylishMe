import { EDITORIAL_IMG } from "./product-catalog";

export type Outfit = {
  id: string;
  title: string;
  note: string;
  curator: string;
  location: string;
  image: string;
  productIds: string[];
};

export type OutfitStory = {
  id: string;
  label: string;
  outfitId: string;
  image: string;
  accent: string;
};

export const OUTFITS: Outfit[] = [
  {
    id: "windhoek-soft-power",
    title: "Soft Power in Windhoek",
    note: "Coral fleece, utility tailoring and a clean street sneaker.",
    curator: "Omutima Studio",
    location: "Windhoek, Namibia",
    image: EDITORIAL_IMG[0],
    productIds: ["p1", "p7", "p2", "p4"],
  },
  {
    id: "coastline-weekend",
    title: "Coastline Weekend",
    note: "Relaxed linen and structured accessories for the Atlantic coast.",
    curator: "Coastline Atelier",
    location: "Swakopmund, Namibia",
    image: EDITORIAL_IMG[1],
    productIds: ["p12", "p9", "p4", "p2"],
  },
  {
    id: "ceremony-modern",
    title: "Modern Ceremony",
    note: "A refined Namibian occasion edit with confident colour.",
    curator: "Selma K Couture",
    location: "Ongwediva, Namibia",
    image: EDITORIAL_IMG[2],
    productIds: ["p3", "p11", "p9"],
  },
  {
    id: "desert-after-dark",
    title: "Desert After Dark",
    note: "Sharp monochrome layers softened with a warm accessory.",
    curator: "Street Veld",
    location: "Windhoek, Namibia",
    image: EDITORIAL_IMG[3],
    productIds: ["p10", "p7", "p2", "p9"],
  },
];

export const OUTFIT_STORIES: OutfitStory[] = OUTFITS.map((outfit, index) => ({
  id: `story-${outfit.id}`,
  label: index === 0 ? "Today" : outfit.title.split(" ").slice(0, 2).join(" "),
  outfitId: outfit.id,
  image: outfit.image,
  accent: ["#ff8178", "#7eb8c8", "#c683c9", "#d1a273"][index % 4],
}));

export function getOutfitTotal(
  outfit: Pick<Outfit, "productIds">,
  priceById: Record<string, number>,
) {
  return outfit.productIds.reduce((total, id) => total + (priceById[id] ?? 0), 0);
}

export function getUnavailableProductIds(
  outfit: Pick<Outfit, "productIds">,
  stockById: Record<string, boolean>,
) {
  return outfit.productIds.filter((id) => !stockById[id]);
}
