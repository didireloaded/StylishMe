export type Product = {
  id: string;
  name: string;
  designer: string;
  location: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  material: string;
  fit: string;
  description: string;
  colors: string[];
  sizes: string[];
  stock: number[];
  delivery: string;
  pickup: boolean;
  madeLocal?: boolean;
  madeToOrder?: boolean;
  variantOptions?: Array<{ variantId: string; size: string; colour: string; displayColor: string; stock: number }>;
  sellerType: "Designer" | "Brand & boutique" | "Merch";
};

const pexelsStock = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900&h=1200&fit=crop`;

// Each catalogue position has its own human-shot Pexels stock photograph.
export const IMG = [
  29717200, 29718556, 29644656, 29664770, 29651848, 24783996, 1661837,
  4977270, 4890733, 10679167, 15571643, 27948344, 29708191, 29707603,
  29654666, 29594648, 15968866, 36446483, 14945580, 32498761, 20862358,
  35501782, 29271917, 14633139, 13012412, 30115291, 14663487, 7778888,
  27460861, 31589335, 18036897, 16268679, 10482937, 34713100, 35374302,
  3095442, 14079121, 35187763, 35666033, 9327162, 5352628,
].map(pexelsStock);

export const EDITORIAL_IMG = [
  135620, 7165636, 8685526, 7543637, 27516985, 1027130, 1102776,
].map(pexelsStock);

const bases = [
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
] as const;

export function buildProduct(index: number): Product {
  if (index === 40) {
    return {
      id: "p41",
      name: "Etosha Woven Belt",
      designer: "Desert Thread",
      location: "Swakopmund",
      category: "Accessories",
      price: 499,
      image: IMG[40],
      badge: "New Arrival",
      material: "Woven cotton and leather",
      fit: "Adjustable",
      description: "A considered wardrobe piece made for Namibia's climate, everyday movement and modern style.",
      colors: ["#e9d6bd", "#17171d", "#988ee8"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: [2, 4, 5, 3, 1],
      delivery: "2–4 days nationwide",
      pickup: true,
      madeLocal: true,
      sellerType: "Designer",
    };
  }

  const base = bases[index % bases.length];
  const round = Math.floor(index / bases.length);
  const name = round ? `${base[0]} ${round + 1}` : base[0];
  const madeLocal = index % 4 === 0;
  const madeToOrder = index % 9 === 0;
  const sellerType: Product["sellerType"] = /tee|hoodie/i.test(name)
    ? "Merch"
    : madeLocal || madeToOrder
      ? "Designer"
      : "Brand & boutique";

  return {
    id: `p${index + 1}`,
    name,
    designer: base[1],
    location: ["Windhoek", "Swakopmund", "Ongwediva", "Walvis Bay"][index % 4],
    category: base[2],
    price: base[3] + round * 120,
    oldPrice: index % 5 === 1 ? base[3] + 400 : undefined,
    image: IMG[index],
    badge: index % 7 === 0 ? "Limited Drop" : index % 4 === 0 ? "Made in Namibia" : index % 3 === 0 ? "New Arrival" : undefined,
    material: base[4],
    fit: base[5],
    description: "A considered wardrobe piece made for Namibia's climate, everyday movement and modern style.",
    colors: ["#f3a4b8", "#988ee8", "#83afd9", "#d6b4dd", "#e9d6bd"],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: [3, 5, 1, index % 4 === 0 ? 0 : 4, 2],
    delivery: index % 3 === 0 ? "1–2 days to Windhoek" : "2–4 days nationwide",
    pickup: index % 2 === 0,
    madeLocal,
    madeToOrder,
    sellerType,
  };
}
