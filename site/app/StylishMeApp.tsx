"use client";

/* External catalogue photography is intentionally rendered at its native crop. */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useRef, useState } from "react";

import OutfitsView from "./OutfitsView";
import OutfitStoryViewer from "./OutfitStoryViewer";
import CustomerStoryComposer from "./CustomerStoryComposer";
import CustomerStoryViewer from "./CustomerStoryViewer";
import LogoutButton from "./LogoutButton";
import AccountDeletionControl from "./AccountDeletionControl";
import AccountConnections from "./AccountConnections";
import TryOnView from "./TryOnView";
import { cartLineForSelection, getFirstStockedSize, getSizeStock, mergeCartLinesWithinStock, type CartLine } from "./cart-commerce";
import { getOutfitTotal, OUTFITS, OUTFIT_STORIES } from "./outfit-catalog";
import { buildProduct, IMG, type Product } from "./product-catalog";
import { toCustomerProduct } from "./customer-catalogue";
import { DEFAULT_SHOP_FILTERS, filterShopProducts, type ShopFilterState } from "./shop-filter";
import { checkoutDestinationHeading } from "./unified-domain";
import type { EligibleStoryItem, PublicCustomerStory } from "./customer-story-domain";
import { mergeGuestShoppingState } from "./guest-state";

type View = "home" | "shop" | "stores" | "search" | "seller-directory" | "product" | "designer" | "outfits" | "try-on" | "wishlist" | "wardrobe" | "cart" | "checkout" | "confirmation" | "orders" | "tracking" | "profile" | "addresses" | "notifications" | "support" | "settings";
type FulfilmentMethod = "Standard delivery" | "Express delivery" | "Store collection";
type OrderFulfilment = {
  id: string; orderId: string; storeName: string; status: string; statusLabel: string; fulfilmentMethod: "delivery" | "collection";
  subtotal: number; createdAt: string; provider: string | null; trackingNumber: string | null; trackingUrl: string | null;
  estimatedDeliveryAt: string | null; events: Array<{ status: string; label: string; description: string; location: string | null; occurredAt: string }>;
};
type Order = { id: string; date: string; status: string; total: number; fulfilment: FulfilmentMethod; items: CartLine[]; fulfilments?: OrderFulfilment[] };
const trackingPath = (kind: "delivery" | "collection") => kind === "collection"
  ? [["new", "Order confirmed"], ["preparing", "Store preparing order"], ["ready_to_collect", "Ready to collect"], ["collected", "Collected"]]
  : [["new", "Order confirmed"], ["preparing", "Store preparing order"], ["shipped", "Collected by courier"], ["in_transit", "In transit"], ["out_for_delivery", "Out for delivery"], ["delivered", "Delivered"]];
const trackingTime = (value: string) => new Intl.DateTimeFormat("en-NA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
type DesignerSummary = { location: string; rating: string; followers: string; delivery: string; storyTitle: string; story: string; image: string };
type PendingOutfitAdd = { outfitId: string; productIds: string[]; selectionProductIds: string[]; unavailableCount: number };
type OrderFilter = "Active" | "Delivered" | "Cancelled";
type SellerLane = "Designers" | "Brands & boutiques" | "Merch";
type Address = { label: string; street: string; city: string };
type AddressEditor = Address & { index: number | null };

const profileViews: View[] = ["profile", "wardrobe", "orders", "tracking", "addresses", "notifications", "support", "settings"];

const designerSummaries: Record<string, DesignerSummary> = {
  "Omutima Studio": {
    location: "Windhoek, Khomas",
    rating: "4.9",
    followers: "12.8k",
    delivery: "Nationwide",
    storyTitle: "Quiet confidence, made locally.",
    story: "Founded in Windhoek, Omutima Studio creates modern essentials inspired by Namibia's tones, textures and movement.",
    image: IMG[11],
  },
  "Desert Thread": {
    location: "Swakopmund, Erongo",
    rating: "4.8",
    followers: "9.6k",
    delivery: "2–4 days",
    storyTitle: "Built for movement across Namibia.",
    story: "Desert Thread pairs relaxed coastal energy with durable materials for everyday journeys from Swakopmund to Windhoek.",
    image: IMG[1],
  },
  "Selma K Couture": {
    location: "Ongwediva, Oshana",
    rating: "4.9",
    followers: "18.4k",
    delivery: "Nationwide",
    storyTitle: "Occasion dressing with Oshana soul.",
    story: "Selma K Couture shapes expressive ceremony pieces in Ongwediva, balancing contemporary silhouettes with Namibian colour.",
    image: IMG[2],
  },
  "Coastline Atelier": {
    location: "Walvis Bay, Erongo",
    rating: "4.7",
    followers: "7.9k",
    delivery: "2–4 days",
    storyTitle: "Atlantic restraint, thoughtfully crafted.",
    story: "From Walvis Bay, Coastline Atelier makes structured bags and quiet wardrobe pieces informed by the Atlantic landscape.",
    image: IMG[8],
  },
  "Heritage House": {
    location: "Oshakati, Oshana",
    rating: "4.9",
    followers: "15.1k",
    delivery: "Nationwide",
    storyTitle: "Print traditions, tailored for today.",
    story: "Heritage House works with Namibian print and local makers to carry familiar patterns into modern, wearable forms.",
    image: IMG[4],
  },
  "North 22": {
    location: "Windhoek, Khomas",
    rating: "4.6",
    followers: "6.3k",
    delivery: "1–3 days",
    storyTitle: "Utility refined in Windhoek.",
    story: "North 22 develops practical menswear with clean lines, breathable cloth and details suited to life in the capital.",
    image: IMG[9],
  },
  "Street Veld": {
    location: "Katutura, Windhoek",
    rating: "4.8",
    followers: "11.7k",
    delivery: "Nationwide",
    storyTitle: "Katutura energy after dark.",
    story: "Street Veld translates Windhoek street culture into confident layers, limited drops and relaxed Namibian tailoring.",
    image: IMG[10],
  },
  "Mvula Menswear": {
    location: "Rundu, Kavango East",
    rating: "4.7",
    followers: "5.8k",
    delivery: "3–5 days",
    storyTitle: "Modern tailoring from the Kavango.",
    story: "Mvula Menswear cuts polished suiting in Rundu with a lightness and ease designed for Namibia's climate.",
    image: IMG[5],
  },
};

const seededDesignerNames = Object.keys(designerSummaries);
const shopCategories = ["All", "Women", "Men", "Clothing", "Shoes", "Accessories", "Bags", "Designer", "Traditional", "Sale"] as const;

const seededProducts: Product[] = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const filterColors = [
  ["Pink", "#f3a4b8"],
  ["Lilac", "#988ee8"],
  ["Blue", "#83afd9"],
  ["Mauve", "#d6b4dd"],
  ["Sand", "#e9d6bd"],
  ["Black", "#17171d"],
] as const;
const sellerLaneDetails: Record<SellerLane, { heading: string; description: string }> = {
  Designers: { heading: "Namibian designers", description: "Original collections, atelier stories and made-to-order pieces." },
  "Brands & boutiques": { heading: "Brands & boutiques", description: "Curated stores, independent labels and fashion retailers." },
  Merch: { heading: "Merch drops", description: "Creator, artist and event collections in one place." },
};
const sellerLaneNames: Record<SellerLane, string[]> = {
  Designers: ["Omutima Studio", "Selma K Couture", "Heritage House", "Coastline Atelier"],
  "Brands & boutiques": ["Desert Thread", "North 22", "Street Veld", "Mvula Menswear"],
  Merch: ["Omutima Studio", "Desert Thread"],
};

const priceById = Object.fromEntries(seededProducts.map((product) => [product.id, product.price]));
const storyProducts = seededProducts.map(({ id, name, image, price, stock }) => ({
  id,
  name,
  image,
  price,
  available: stock.some((quantity) => quantity > 0),
}));

const defaultOrders: Order[] = [
  { id: "SM-2026-1048", date: "12 Jul 2026", status: "In transit", total: 2098, fulfilment: "Standard delivery", items: [{ productId: "p1", size: "M", color: "#f3a4b8", quantity: 1 }, { productId: "p2", size: "42", color: "#83afd9", quantity: 1 }] },
  { id: "SM-2026-1032", date: "08 Jul 2026", status: "Ready to collect", total: 799, fulfilment: "Store collection", items: [{ productId: "p4", size: "One size", color: "#17171d", quantity: 1 }] },
  { id: "SM-2026-1017", date: "30 Jun 2026", status: "Delivered", total: 2450, fulfilment: "Express delivery", items: [{ productId: "p3", size: "M", color: "#988ee8", quantity: 1 }] },
  { id: "SM-2026-0982", date: "18 Jun 2026", status: "Delivered", total: 1190, fulfilment: "Standard delivery", items: [{ productId: "p9", size: "One size", color: "#e9d6bd", quantity: 1 }] },
  { id: "SM-2026-0931", date: "02 Jun 2026", status: "Cancelled", total: 749, fulfilment: "Standard delivery", items: [{ productId: "p6", size: "L", color: "#83afd9", quantity: 1 }] },
];
const money = (value: number) => `N$${value.toLocaleString("en-US")}`;
const defaultAddresses: Address[] = [{ label: "Home", street: "12 Independence Avenue", city: "Windhoek, Khomas" }, { label: "Ongwediva collection", street: "Main Road", city: "Ongwediva" }, { label: "Swakopmund holiday", street: "Sam Nujoma Avenue", city: "Swakopmund" }];
const supportTopics: Record<string, string> = {
  "Delivery and collection": "Compare standard, express and store-collection delivery options, including fees and estimated arrival times, before checkout.",
  "Returns and refunds": "Eligible items can be returned within 14 days when unworn, unwashed and returned with their original tags.",
  Payments: "StylishMe uses secure hosted checkout. Payment details are entered with the payment provider and are never stored by StylishMe.",
  "Product authenticity": "Verified designer profiles and catalogue attribution help customers identify each item's maker and origin.",
  "Contact support": "For order help, use the order number shown in My Orders when contacting the StylishMe support team.",
  "Terms and privacy": "Your shopping state is stored securely. Try On photos are processed for the preview and are not saved by StylishMe.",
};

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
  if (name === "bell") return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
  if (name === "bag") return <svg {...common}><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
  if (name === "home") return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></svg>;
  if (name === "shop") return <svg {...common}><path d="M4 9h16l-1 12H5L4 9Z" /><path d="M8 9a4 4 0 0 1 8 0" /></svg>;
  if (name === "sparkles") return <svg {...common}><path d="m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z" /><path d="m18.5 14 .72 2.28L21.5 17l-2.28.72L18.5 20l-.72-2.28L15.5 17l2.28-.72L18.5 14Z" /><path d="m5 13 .5 1.5L7 15l-1.5.5L5 17l-.5-1.5L3 15l1.5-.5L5 13Z" /></svg>;
  if (name === "heart") return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>;
  if (name === "profile") return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
  if (name === "share") return <svg {...common}><path d="M12 16V3m0 0L7 8m5-5 5 5" /><path d="M5 12v9h14v-9" /></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  return <svg {...common}><path d="M4 4h16v16H4z" /></svg>;
}

function ProductCard({ product, open, saved, toggle }: { product: Product; open: () => void; saved: boolean; toggle: () => void }) {
  return <article className="product-card">
    <button className="product-image" onClick={open} aria-label={`Open ${product.name}`}><img src={product.image} alt={product.name} />{product.badge && <span className="badge">{product.badge}</span>}</button>
    <button className={`heart ${saved ? "saved" : ""}`} onClick={toggle} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}>{saved ? "♥" : "♡"}</button>
    <button className="product-copy" onClick={open}><small>{product.designer}</small><strong>{product.name}</strong><span>{money(product.price)} {product.oldPrice && <s>{money(product.oldPrice)}</s>}</span></button>
  </article>;
}

export default function StylishMeApp({
  user,
  demoMode = false,
}: {
  user: { name: string; email: string; avatarUrl: string } | null;
  demoMode?: boolean;
}) {
  const [catalogueProducts, setCatalogueProducts] = useState<Product[]>(seededProducts);
  const products = catalogueProducts;
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "home";
    const requested = new URLSearchParams(window.location.search).get("view");
    return requested === "profile" || requested === "orders" ? requested : "home";
  });
  const [selectedId, setSelectedId] = useState("p1");
  const [productReturnView, setProductReturnView] = useState<View>("shop");
  const [wishlist, setWishlist] = useState<string[]>(user ? [] : ["p2", "p4", "p7", "p9", "p11", "p14"]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>(user ? [] : defaultOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(user ? "" : defaultOrders[0].id);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("Active");
  const [savedOutfits, setSavedOutfits] = useState<string[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [customerStories, setCustomerStories] = useState<Array<PublicCustomerStory & { inRing: boolean }>>([]);
  const [eligibleStoryItems, setEligibleStoryItems] = useState<EligibleStoryItem[]>([]);
  const [customerStoriesError, setCustomerStoriesError] = useState("");
  const [trendingProductIds, setTrendingProductIds] = useState<string[]>([]);
  const [newProductIds, setNewProductIds] = useState<string[]>([]);
  const [featuredDesigner, setFeaturedDesigner] = useState("");
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [activeCustomerStoryId, setActiveCustomerStoryId] = useState<string | null>(null);
  const storyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const checkoutKeyRef = useRef("");
  const [selectedOutfitId, setSelectedOutfitId] = useState(OUTFITS[0].id);
  const [selectedDesigner, setSelectedDesigner] = useState("Omutima Studio");
  const [designerReturnView, setDesignerReturnView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [storeQuery, setStoreQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Recommended");
  const [sellerLane, setSellerLane] = useState<SellerLane>("Designers");
  const [shopFilters, setShopFilters] = useState<ShopFilterState>({ ...DEFAULT_SHOP_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("#f3a4b8");
  const [selectedProductImage, setSelectedProductImage] = useState(products[0].image);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [delivery, setDelivery] = useState("Standard delivery");
  const [toast, setToast] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentAvailable, setPaymentAvailable] = useState(demoMode);
  const [paymentConfigLoaded, setPaymentConfigLoaded] = useState(demoMode);
  const [dataLight, setDataLight] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState({ city: "Windhoek", size: "M", shoe: "39", fit: "Regular" });
  const [pendingOutfitAdd, setPendingOutfitAdd] = useState<PendingOutfitAdd | null>(null);
  const [outfitSizeSelections, setOutfitSizeSelections] = useState<Record<string, string>>({});
  const [savedOutfitMode, setSavedOutfitMode] = useState(false);
  const [tryOnProductIds, setTryOnProductIds] = useState<string[]>(["p1"]);
  const [tryOnIntent, setTryOnIntent] = useState<"style" | "try-on">("try-on");
  const [outfitReplacements, setOutfitReplacements] = useState<Record<string, Record<string, string>>>({});
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [followedDesigners, setFollowedDesigners] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<Address[]>(user ? [] : defaultAddresses);
  const [addressesReturnView, setAddressesReturnView] = useState<View>("profile");
  const [addressEditor, setAddressEditor] = useState<AddressEditor | null>(null);
  const [supportTopic, setSupportTopic] = useState<string | null>(null);
  const stateStorageKey = demoMode ? "stylishme-demo-customer-state" : `stylishme-state:${user?.email ?? "signed-out"}`;

  useEffect(() => {
    let active = true;
    void fetch("/api/catalog")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body) => {
        if (!active || !Array.isArray(body?.products)) return;
        const liveProducts = body.products.map(toCustomerProduct).filter((product: Product | null): product is Product => Boolean(product));
        const merged = new Map(seededProducts.map((product) => [product.id, product]));
        for (const product of liveProducts) merged.set(product.id, product);
        setCatalogueProducts(Array.from(merged.values()));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (demoMode) return;
    let active = true;
    void fetch("/api/payments/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body) => { if (active) setPaymentAvailable(body?.available === true); })
      .catch(() => { if (active) setPaymentAvailable(false); })
      .finally(() => { if (active) setPaymentConfigLoaded(true); });
    return () => { active = false; };
  }, [demoMode]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const shopLocations = useMemo(() => [...new Set(products.map((product) => product.location))], [products]);
  const catalogueDesignerNames = useMemo(() => [...new Set(products.map((product) => product.designer))], [products]);
  const designerFilterNames = useMemo(() => [...new Set([...seededDesignerNames, ...products.filter((product) => product.sellerType === "Designer").map((product) => product.designer)])], [products]);

  const selected = products.find(p => p.id === selectedId) ?? products[0];
  const activeCustomerStory = customerStories.find(story => story.id === activeCustomerStoryId) ?? null;
  const designerProducts = products.filter((product) => product.designer === selectedDesigner);
  const selectedDesignerSummary = designerSummaries[selectedDesigner] ?? designerSummaries["Omutima Studio"];
  const sellerDirectoryDetails = sellerLaneDetails[sellerLane];
  const sellerDirectoryNames = sellerLaneNames[sellerLane];
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + (products.find(p => p.id === line.productId)?.price ?? 0) * line.quantity, 0);
  const fee = delivery === "Store collection" ? 0 : delivery === "Express delivery" ? 120 : 65;
  const checkoutNeedsAddress = checkoutStep === 1 && delivery !== "Store collection" && addresses.length === 0;
  const filteredOrders = orders.filter((order) => orderFilter === "Active"
    ? !["Delivered", "Cancelled"].includes(order.status)
    : order.status === orderFilter);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const isCollectionOrder = selectedOrder?.fulfilment === "Store collection";
  const selectedIndex = Math.max(0, products.findIndex((product) => product.id === selected.id));
  const selectedGallery = [selected.image, IMG[(selectedIndex + 3) % IMG.length], IMG[(selectedIndex + 7) % IMG.length]]
    .filter((image, index, list) => list.indexOf(image) === index);
  const completeTheLook = products
    .filter((product) => product.id !== selected.id && product.designer !== selected.designer)
    .slice(selectedIndex % 5, selectedIndex % 5 + 3);
  const editorialStories = useMemo(() => {
    const offset = Math.floor(Date.now() / (2 * 24 * 60 * 60 * 1000)) % OUTFIT_STORIES.length;
    return [...OUTFIT_STORIES.slice(offset), ...OUTFIT_STORIES.slice(0, offset)];
  }, []);
  const trendingProducts = (trendingProductIds.length
    ? trendingProductIds.map(id => productById.get(id)).filter((product): product is Product => Boolean(product))
    : products.filter(product => product.stock.some(quantity => quantity > 0)).slice(4, 12)).slice(0, 4);
  const newArrivalProducts = (newProductIds.length ? newProductIds.map(id => productById.get(id)).filter((product): product is Product => Boolean(product)) : products).filter(product => product.stock.some(quantity => quantity > 0)).slice(0, 4);

  const refreshCustomerStories = async () => {
    try {
      const response = await fetch("/api/customer-stories", { cache: "no-store" });
      if (!response.ok) throw new Error("stories unavailable");
      const body = await response.json() as {
        stories?: Array<PublicCustomerStory & { inRing: boolean }>;
        eligibleItems?: EligibleStoryItem[];
      };
      const nextStories = body.stories ?? [];
      setCustomerStories(nextStories);
      setEligibleStoryItems(body.eligibleItems ?? []);
      setCustomerStoriesError("");
      const linkedStory = new URLSearchParams(window.location.search).get("story");
      if (linkedStory && nextStories.some(story => story.id === linkedStory)) setActiveCustomerStoryId(linkedStory);
    } catch {
      setCustomerStoriesError("Outfit stories are resting");
    }
  };

  useEffect(() => {
    const stateUrl = user ? "/api/state?account=1" : "/api/state";
    fetch(stateUrl).then(response => {
      if (response.status === 401) {
        const requested = new URLSearchParams(window.location.search).get("view");
        const returnTo = requested === "orders" ? "/orders" : requested === "profile" ? "/profile" : "/";
        window.location.replace(`/login?reason=expired&returnTo=${encodeURIComponent(returnTo)}`);
        return new Promise<never>(() => undefined);
      }
      return response.ok ? response.json() : Promise.reject();
    }).then(({ state }) => {
      if (state) {
        let nextCart = state.cart ?? [];
        let nextWishlist = state.wishlist ?? [];
        if (user) {
          const guestRaw = localStorage.getItem("stylishme-state:guest");
          if (guestRaw) {
            try {
              const guestState = JSON.parse(guestRaw);
              const merged = mergeGuestShoppingState({ cart: nextCart, wishlist: nextWishlist }, guestState);
              nextCart = mergeCartLinesWithinStock([], merged.cart, productById).lines;
              nextWishlist = merged.wishlist.filter(id => productById.has(id));
              localStorage.removeItem("stylishme-state:guest");
              setToast("Your guest bag and wishlist were added");
            } catch {}
          }
        }
        setCart(nextCart);
        setWishlist(nextWishlist);
        setOrders(Array.isArray(state.orders) ? state.orders : []);
        setProfile((current) => ({
          ...current,
          city: state.profile?.city ?? current.city,
          size: state.profile?.size ?? current.size,
          shoe: state.profile?.shoe ?? current.shoe,
          fit: state.profile?.fit ?? current.fit,
        }));
        setSavedOutfits(state.savedOutfits ?? state.profile?.savedOutfits ?? []);
        if (Array.isArray(state.profile?.addresses)) setAddresses(state.profile.addresses);
        if (Array.isArray(state.profile?.followedDesigners)) setFollowedDesigners(state.profile.followedDesigners);
        if (typeof state.profile?.dataLight === "boolean") setDataLight(state.profile.dataLight);
      }
    }).catch(() => {
      const saved = localStorage.getItem(stateStorageKey);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setCart(state.cart ?? []);
          setWishlist(state.wishlist ?? []);
          setOrders(state.orders ?? defaultOrders);
          setProfile((current) => ({ ...current, ...(state.profile ?? {}) }));
          setSavedOutfits(state.savedOutfits ?? []);
          setAddresses(state.addresses ?? defaultAddresses);
          setFollowedDesigners(state.followedDesigners ?? []);
          setDataLight(Boolean(state.dataLight));
        } catch {}
      }
    }).finally(() => setHydrated(true));
  }, [productById, stateStorageKey, user]);

  useEffect(() => {
    if (!hydrated) return;
    const state = { cart, wishlist, orders, profile, savedOutfits, addresses, followedDesigners, dataLight };
    localStorage.setItem(stateStorageKey, JSON.stringify(state));
    const serverState = { ...state, profile: { ...profile, addresses, followedDesigners, dataLight } };
    const timer = window.setTimeout(() => fetch("/api/state", { method: "POST", headers: { "content-type": "application/json", ...(user ? { "x-stylishme-account": "1" } : {}) }, body: JSON.stringify(serverState) }).then(response => {
      if (response.status === 401) window.location.replace(`/login?reason=expired&returnTo=${encodeURIComponent(view === "orders" ? "/orders" : view === "profile" ? "/profile" : "/")}`);
    }).catch(() => undefined), 500);
    return () => window.clearTimeout(timer);
  }, [addresses, cart, dataLight, followedDesigners, hydrated, orders, profile, savedOutfits, stateStorageKey, user, view, wishlist]);

  useEffect(() => {
    if (demoMode || !user || view !== "tracking" || !selectedOrderId || !/^SM-\d{4}-[A-Z0-9]{8}$/.test(selectedOrderId)) return;
    void fetch(`/api/orders/${encodeURIComponent(selectedOrderId)}/tracking`, { cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Tracking is unavailable"); return body; })
      .then(body => setOrders(current => current.map(order => order.id === selectedOrderId ? { ...order, fulfilments: Array.isArray(body.fulfilments) ? body.fulfilments : [] } : order)))
      .catch(error => setToast(error instanceof Error ? error.message : "Tracking is unavailable"));
  }, [demoMode, selectedOrderId, user, view]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;
    const messages: Record<string, string> = {
      paid: "Payment confirmed. Your order is being prepared.",
      pending: "Payment is still being confirmed. We will update your order shortly.",
      declined: "Payment was declined. No charge was completed.",
      expired: "Payment time expired. Reserved stock has been released.",
      cancelled: "Payment was cancelled. No charge was completed.",
      "verification-error": "We could not confirm payment yet. Check this order again shortly.",
    };
    setToast(messages[payment] ?? "Payment status updated");
    const orderId = params.get("order");
    if (orderId && /^[A-Z0-9-]{8,80}$/i.test(orderId)) setSelectedOrderId(orderId);
    window.history.replaceState(null, "", "/?view=orders");
  }, []);
  useEffect(() => { void refreshCustomerStories(); }, []);
  useEffect(() => { void fetch("/api/discovery").then(response => response.ok ? response.json() : null).then(body => { setTrendingProductIds(Array.isArray(body?.trendingProductIds) ? body.trendingProductIds : []); setNewProductIds(Array.isArray(body?.newProductIds) ? body.newProductIds : []); setFeaturedDesigner(typeof body?.featuredDesigner === "string" ? body.featuredDesigner : ""); }).catch(() => undefined); }, []);
  useEffect(() => {
    const productId = new URLSearchParams(window.location.search).get("product");
    const linkedProduct = productId ? productById.get(productId) : null;
    if (!linkedProduct) return;
    setSelectedId(linkedProduct.id);
    setSelectedSize(linkedProduct.sizes[2] ?? linkedProduct.sizes[0]);
    setSelectedColor(linkedProduct.colors[0]);
    setSelectedProductImage(linkedProduct.image);
    setProductReturnView("shop");
    setView("product");
  }, [productById]);

  const navigate = (next: View) => { setView(next); setFiltersOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const trackActivity = (event: string, targetType?: string, targetId?: string) => {
    if (demoMode) return;
    void fetch("/api/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, targetType, targetId }),
    }).catch(() => undefined);
  };
  const openSellerDirectory = (lane: SellerLane) => {
    setSellerLane(lane);
    navigate("seller-directory");
  };
  const openDesigner = (name: string, returnView: View = view) => {
    trackActivity("designer_viewed", "designer", name);
    setSelectedDesigner(name);
    setDesignerReturnView(returnView);
    navigate("designer");
  };
  const openProduct = (id: string, returnView: View = view) => {
    trackActivity("product_viewed", "product", id);
    setProductReturnView(returnView);
    setSelectedId(id);
    const p = products.find(item => item.id === id)!;
    setSelectedSize(p.sizes[2]);
    setSelectedColor(p.colors[0]);
    setSelectedProductImage(p.image);
    navigate("product");
  };
  const openOutfit = (id: string) => { trackActivity("outfit_viewed", "outfit", id); setSavedOutfitMode(false); setSelectedOutfitId(id); setActiveStoryId(null); navigate("outfits"); };
  const openSavedOutfits = () => {
    setSavedOutfitMode(true);
    if (savedOutfits.length) setSelectedOutfitId(savedOutfits[0]);
    navigate("outfits");
  };
  const startTryOn = (productIds: string[], intent: "style" | "try-on" = "try-on") => {
    const validIds = [...new Set(productIds)].filter((id) => productById.has(id));
    setTryOnProductIds(validIds.length ? validIds : [selected.id]);
    setTryOnIntent(intent);
    trackActivity("try_on_opened", "product", validIds[0] ?? selected.id);
    navigate("try-on");
  };
  const toggleWishlist = (id: string) => {
    setWishlist(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
    setToast(wishlist.includes(id) ? "Removed from wishlist" : "Saved to wishlist");
  };
  const toggleSavedOutfit = (id: string) => {
    setSavedOutfits((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
    setToast(savedOutfits.includes(id) ? "Removed from saved outfits" : "Outfit saved");
  };
  const addProductVariantToCart = (product: Product, size: string, color: string) => {
    const requested = cartLineForSelection(product, size, color, 1);
    if (!requested) {
      setToast("That size and colour combination is unavailable");
      return;
    }
    const result = mergeCartLinesWithinStock(cart, [requested], productById);
    if (result.invalid) {
      setToast("Choose an available size and colour");
      return;
    }
    if (!result.added) {
      setToast(`${product.name} is at its stock limit`);
      return;
    }
    setCart(result.lines);
    setToast("Added to cart");
  };
  const addToCart = (product = selected) => addProductVariantToCart(product, selectedSize, selectedColor);
  const quickAddWishlistItem = (product: Product) => {
    const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
    const size = getSizeStock(product, recommendation) > 0 ? recommendation : getFirstStockedSize(product);
    if (!size || !product.colors[0]) {
      setToast(`${product.name} is unavailable`);
      return;
    }
    addProductVariantToCart(product, size, product.colors[0]);
  };
  const addTryOnProductsToCart = (productIds: string[]) => {
    const candidates = productIds.flatMap((productId) => {
      const product = productById.get(productId);
      if (!product) return [];
      const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
      const size = getSizeStock(product, recommendation) > 0 ? recommendation : getFirstStockedSize(product);
      return size && product.colors[0]
        ? [{ productId: product.id, size, color: product.colors[0], quantity: 1 }]
        : [];
    });
    const result = mergeCartLinesWithinStock(cart, candidates, productById);
    if (!result.added) {
      setToast("Selected pieces are unavailable or already at their stock limit");
      return;
    }
    setCart(result.lines);
    setToast(`Added ${result.added} ${result.added === 1 ? "piece" : "pieces"} to cart`);
  };
  const getOutfitProducts = (outfitId: string, overrideProductIds?: string[]) => {
    const outfit = OUTFITS.find((item) => item.id === outfitId);
    return (overrideProductIds ?? outfit?.productIds ?? []).flatMap((productId) => {
      const product = productById.get(productId);
      return product ? [product] : [];
    });
  };
  const commitOutfitAdd = (outfitId: string, sizeSelections: Record<string, string>, productIds?: string[]) => {
    const outfitProducts = getOutfitProducts(outfitId, productIds);
    const unavailableCount = outfitProducts.filter((product) => !getFirstStockedSize(product)).length;
    const requested = outfitProducts.flatMap((product): CartLine[] => {
      if (!getFirstStockedSize(product)) return [];
      const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
      const size = getSizeStock(product, recommendation) > 0
        ? recommendation
        : sizeSelections[product.id];
      if (!size || !product.colors[0]) return [];
      return [{ productId: product.id, size, color: product.colors[0], quantity: 1 }];
    });
    const result = mergeCartLinesWithinStock(cart, requested, productById);
    setCart(result.lines);
    setPendingOutfitAdd(null);
    setOutfitSizeSelections({});
    const addedCopy = `Added ${result.added} ${result.added === 1 ? "item" : "items"}`;
    const notes = [
      unavailableCount ? `${unavailableCount} unavailable` : "",
      result.capped ? `${result.capped} at stock limit` : "",
    ].filter(Boolean);
    setToast(notes.length ? `${addedCopy} · ${notes.join(" · ")}` : `${addedCopy} to cart`);
  };
  const addOutfitToCart = (outfitId: string, productIds?: string[]) => {
    const outfitProducts = getOutfitProducts(outfitId, productIds);
    const unavailableCount = outfitProducts.filter((product) => !getFirstStockedSize(product)).length;
    const selectionProductIds = outfitProducts.filter((product) => {
      if (!getFirstStockedSize(product)) return false;
      const recommendation = product.category === "Shoes" ? profile.shoe : profile.size;
      return getSizeStock(product, recommendation) < 1;
    }).map((product) => product.id);
    if (!outfitProducts.length || unavailableCount === outfitProducts.length) {
      setToast("This outfit is currently unavailable");
      return;
    }
    if (selectionProductIds.length) {
      setActiveStoryId(null);
      setOutfitSizeSelections({});
      setPendingOutfitAdd({ outfitId, productIds: outfitProducts.map((product) => product.id), selectionProductIds, unavailableCount });
      return;
    }
    commitOutfitAdd(outfitId, {}, productIds);
  };
  const replaceOutfitProduct = (originalProductId: string, currentProductId: string) => {
    const currentProduct = productById.get(currentProductId);
    if (!currentProduct) return;
    const selectedIds = new Set(OUTFITS.find((outfit) => outfit.id === selectedOutfitId)?.productIds.map((id) => outfitReplacements[selectedOutfitId]?.[id] ?? id) ?? []);
    const alternatives = products.filter((product) => product.category === currentProduct.category && getFirstStockedSize(product) && !selectedIds.has(product.id));
    const replacement = alternatives.find((product) => product.id !== currentProductId);
    if (!replacement) {
      setToast(`No alternative ${currentProduct.category.toLowerCase()} is available right now`);
      return;
    }
    setOutfitReplacements((current) => ({
      ...current,
      [selectedOutfitId]: { ...current[selectedOutfitId], [originalProductId]: replacement.id },
    }));
    setToast(`Replaced ${currentProduct.name} with ${replacement.name}`);
  };
  const updateQty = (index: number, delta: number) => {
    const line = cart[index];
    if (!line) return;
    if (delta > 0) {
      const product = productById.get(line.productId);
      if (!product) return;
      const result = mergeCartLinesWithinStock(cart, [{ ...line, quantity: 1 }], productById);
      if (!result.added) {
        setToast(`${product.name} is at its stock limit`);
        return;
      }
      setCart(result.lines);
      return;
    }
    setCart(cart.map((item, itemIndex) => itemIndex === index
      ? { ...item, quantity: item.quantity - 1 }
      : item).filter((item) => item.quantity > 0));
  };
  const finishOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setOrders(current => [order, ...current.filter(existing => existing.id !== order.id)]);
    setCart([]);
    setCheckoutStep(0);
    navigate("confirmation");
  };
  const placeOrder = async () => {
    if (placingOrder) return;
    const fulfilment = delivery as FulfilmentMethod;
    if (demoMode) {
      const now = new Date();
      finishOrder({
        id: `SM-DEMO-${now.getTime()}`,
        date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: fulfilment === "Store collection" ? "Preparing for collection" : "Order confirmed",
        total: subtotal + fee,
        fulfilment,
        items: cart,
      });
      return;
    }
    setPlacingOrder(true);
    try {
      const checkoutKey = checkoutKeyRef.current || crypto.randomUUID();
      checkoutKeyRef.current = checkoutKey;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": checkoutKey },
        body: JSON.stringify({ fulfilment }),
      });
      const body = await response.json().catch(() => ({})) as { order?: Order; error?: string };
      if (response.status === 401) {
        window.location.replace(`/login?reason=expired&returnTo=${encodeURIComponent("/")}`);
        return;
      }
      if (!response.ok || !body.order) throw new Error(body.error ?? "Unable to prepare your order");
      const paymentResponse = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `${checkoutKey}pay` },
        body: JSON.stringify({ orderId: body.order.id }),
      });
      const payment = await paymentResponse.json().catch(() => ({})) as { checkoutUrl?: string; error?: string };
      if (paymentResponse.status === 401) {
        window.location.replace(`/login?reason=expired&returnTo=${encodeURIComponent("/")}`);
        return;
      }
      if (!paymentResponse.ok || !payment.checkoutUrl) throw new Error(payment.error ?? "Secure payment could not be started");
      window.location.assign(payment.checkoutUrl);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to prepare your order");
    } finally {
      setPlacingOrder(false);
    }
  };
  const toggleDesignerFollow = () => {
    setFollowedDesigners((current) => current.includes(selectedDesigner)
      ? current.filter((designer) => designer !== selectedDesigner)
      : [...current, selectedDesigner]);
  };
  const shareProduct = async (product: Product) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("product", product.id);
    const payload = { title: product.name, text: `${product.name} by ${product.designer} on StylishMe`, url: url.toString() };
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) await navigator.share(payload);
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload.url);
      else {
        const input = document.createElement("textarea");
        input.value = payload.url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setToast(canShare ? "Share sheet opened" : "Product link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setToast("Unable to share this product right now");
    }
  };
  const saveAddress = () => {
    if (!addressEditor) return;
    const clean = { label: addressEditor.label.trim(), street: addressEditor.street.trim(), city: addressEditor.city.trim() };
    if (!clean.label || !clean.street || !clean.city) return;
    setAddresses((current) => addressEditor.index === null
      ? [...current, clean]
      : current.map((address, index) => index === addressEditor.index ? clean : address));
    setAddressEditor(null);
    setToast(addressEditor.index === null ? "Address added" : "Address updated");
  };

  const filtered = useMemo(() => {
    let list = filterShopProducts(products, category, designerFilterNames, shopFilters).filter((product) => {
      const searchable = `${product.name} ${product.designer} ${product.category} ${product.location}`.toLowerCase();
      return searchable.includes(query.toLowerCase());
    });
    if (sort === "Price low to high") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "Price high to low") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [category, designerFilterNames, products, query, shopFilters, sort]);

  const resetShopFilters = () => {
    setCategory("All");
    setSort("Recommended");
    setShopFilters({ ...DEFAULT_SHOP_FILTERS });
  };
  const clearShopDiscovery = () => {
    setQuery("");
    resetShopFilters();
  };
  const activeFilterCount = Object.entries(shopFilters)
    .filter(([key, value]) => value !== DEFAULT_SHOP_FILTERS[key as keyof ShopFilterState]).length;

  const cartButton = () => <button className="circle-btn" onClick={() => navigate("cart")} aria-label={`Open cart, ${cartCount} items`}><Icon name="bag" />{cartCount ? <i>{cartCount}</i> : null}</button>;
  const openStoryComposer = () => {
    if (!user) { window.location.href = "/login?returnTo=/"; return; }
    if (!eligibleStoryItems.length) { setToast("Share an outfit after an order is delivered or collected"); navigate("orders"); return; }
    setStoryComposerOpen(true);
  };
  const header = (title: string, back?: View) => <header className="page-header"><button onClick={() => navigate(back ?? "home")} className="circle-btn" aria-label="Go back">‹</button><strong>{title}</strong>{!["My Cart", "Checkout"].includes(title) && cartButton()}</header>;
  const grid = (list: Product[]) => <div className="product-grid">{list.map(product => <ProductCard key={product.id} product={product} open={() => openProduct(product.id)} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div>;

  let content: React.ReactNode;
  if (view === "home") content = <>
    <header className="brand-header"><h1>STYLISHME</h1><div><button onClick={openStoryComposer} className="circle-btn post-outfit-button" aria-label="Post an outfit"><Icon name="plus" /></button><button onClick={() => navigate("search")} className="circle-btn" aria-label="Search"><Icon name="search" /></button><button onClick={() => navigate("notifications")} className="circle-btn" aria-label="Notifications"><Icon name="bell" /></button>{cartButton()}</div></header>
    <button className="home-search" onClick={() => navigate("search")}><Icon name="search" /><span>Search products, stores and designers</span></button>
    <section className="story-row outfit-story-row" aria-label="Outfit stories">
      {user && eligibleStoryItems.length > 0 && <article className="story-identity customer-story-identity">
        <button className="story-trigger customer-story-add" onClick={() => setStoryComposerOpen(true)}>
          <span><b>+</b></span><small>Add yours</small>
        </button>
        <small className="story-curator">Verified buyers</small>
      </article>}
      {customerStories.filter(story => story.inRing).map(story => <article className="story-identity customer-story-identity" key={story.id}>
        <button className="story-trigger" onClick={() => setActiveCustomerStoryId(story.id)}>
          <span style={{ backgroundImage: `url(${story.imageUrl})` }} />
          <small>{story.displayName || "Worn by you"}</small>
        </button>
        <small className="story-curator customer-story-verified">Verified</small>
      </article>)}
      {editorialStories.map((story) => {
        const outfit = OUTFITS.find((item) => item.id === story.outfitId);
        return <article className="story-identity" key={story.id}>
          <button className="story-trigger" onClick={(event) => {
            storyTriggerRef.current = event.currentTarget;
            setActiveStoryId(story.id);
          }}>
            <span style={{ backgroundImage: `url(${story.image})`, borderColor: story.accent }} />
            <small>{story.label}</small>
          </button>
          {outfit && <button className="story-curator" onClick={() => openDesigner(outfit.curator)}>{outfit.curator}</button>}
        </article>;
      })}
    </section>
    {customerStoriesError && <p className="customer-stories-note">Outfit stories are resting. Our daily edits are still here.</p>}
    <section className="hero-card ootd-hero">
      <img src={OUTFITS[0].image} alt={OUTFITS[0].title} />
      <div>
        <small>Outfit of the day</small>
        <h2>{OUTFITS[0].title}</h2>
        <p>{OUTFITS[0].note}</p>
        <strong>{money(getOutfitTotal(OUTFITS[0], priceById))}</strong>
        <button onClick={() => openOutfit(OUTFITS[0].id)} className="soft-button">Explore the edit</button>
      </div>
    </section>
    <section aria-labelledby="new-arrivals-title">
      <div className="section-title"><h2 id="new-arrivals-title">New arrivals</h2><button onClick={() => navigate("shop")}>View all</button></div>
      <div className="compact-product-row">
        {newArrivalProducts.map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id)} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}
      </div>
    </section>
    <section className="home-look-edit" aria-labelledby="shop-look-title">
      <div className="section-title"><h2 id="shop-look-title">Shop the Look</h2><button onClick={() => openOutfit(OUTFITS[0].id)}>View looks</button></div>
      <button className="look-card home-look-card" onClick={() => openOutfit(OUTFITS[1].id)}>
        <img src={OUTFITS[1].image} alt={OUTFITS[1].title} />
        <div><small>{OUTFITS[1].location}</small><h2>{OUTFITS[1].title}</h2><p>{OUTFITS[1].note}</p><strong>{money(getOutfitTotal(OUTFITS[1], priceById))}</strong></div>
      </button>
    </section>
    <section className="made-local-edit" aria-labelledby="made-local-title">
      <img src={products[4].image} alt="Made in Namibia collection" />
      <div><small>LOCAL CRAFT</small><h2 id="made-local-title">Made in Namibia</h2><p>Modern pieces designed across Namibia, ready to shop.</p><button onClick={() => { setCategory("Designer"); navigate("shop"); }} className="soft-button">Explore local fashion</button></div>
    </section>
    <section aria-labelledby="trending-title">
      <div className="section-title"><h2 id="trending-title">Trending products</h2><button onClick={() => navigate("shop")}>View all</button></div>
      <div className="compact-product-row">
        {trendingProducts.map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id)} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}
      </div>
    </section>
    <section className="home-designers" aria-labelledby="home-designers-title">
      <div className="section-title"><h2 id="home-designers-title">Designer spotlight</h2><button onClick={() => { setCategory("Designer"); navigate("shop"); }}>View all</button></div>
      <div className="home-designer-grid">
        {seededDesignerNames.slice(0, 4).map((name) => {
          const designer = designerSummaries[name];
          return <button className="home-designer-card" key={name} onClick={() => openDesigner(name)}>
            <img src={designer.image} alt="" />
            <strong>{name}</strong>
            <small>{designer.location}, Namibia</small>
          </button>;
        })}
      </div>
    </section>
    <section className="try-on-promo" aria-labelledby="try-on-promo-title">
      <div><small>DIGITAL OUTFIT PREVIEW</small><h2 id="try-on-promo-title">See it on you</h2><p>Upload a full-length photo and preview selected outfits before choosing your size.</p><button className="gradient-button" onClick={() => startTryOn(["p1", "p7", "p2", "p4"], "try-on")}>Try an Outfit</button></div>
      <div className="try-on-promo-art"><img src={products[0].image} alt="Oversized coral hoodie try-on preview" /><span><Icon name="sparkles" /></span></div>
    </section>
  </>;
  else if (view === "shop" || view === "search") content = <>
    {header(view === "search" ? "Search" : "Shop")}
    <div className="search-wrap"><input autoFocus={view === "search"} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, stores and designers" /><button className={activeFilterCount ? "active" : ""} onClick={() => setFiltersOpen(true)}>Filter{activeFilterCount ? ` · ${activeFilterCount}` : ""}</button></div>
    {view === "search" && !query && <section className="suggestions"><h3>Trending searches</h3>{["White sneakers", "Wedding guest dress", "Oversized hoodie", "Namibian designer"].map(item => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}</section>}
    {view === "shop" && <section className="shop-discovery" aria-label="Shop discovery">
      <div className="shop-category-edit">
        <div className="section-title"><h2>Shop by category</h2></div>
        <div className="category-edit-grid">
          {["Women", "Men", "Shoes", "Accessories"].map((item, index) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}><img src={products[[2, 5, 1, 8][index]].image} alt="" /><span>{item}</span></button>)}
        </div>
      </div>
      <div className="seller-lanes">
        <div className="section-title"><h2>Explore sellers</h2><small>Enter a dedicated seller destination</small></div>
        <div className="seller-lane-grid">
          {([
            ["Designers", "Original collections & made-to-order", products[2].image],
            ["Brands & boutiques", "Curated local and imported fashion", products[5].image],
            ["Merch", "Creator, artist and event drops", products[10].image],
          ] as Array<[SellerLane, string, string]>).map(([label, note, image]) => <button key={label} onClick={() => openSellerDirectory(label)}><img src={image} alt="" /><span><strong>{label}</strong><small>{note}</small><b>Explore →</b></span></button>)}
        </div>
      </div>
      <div className="designer-lookbooks">
        <div className="section-title"><h2>Designer lookbooks</h2><button onClick={() => openOutfit(OUTFITS[0].id)}>View all looks</button></div>
        <div className="lookbook-row">{OUTFITS.slice(0, 3).map((outfit) => <button key={outfit.id} onClick={() => openOutfit(outfit.id)}><img src={outfit.image} alt="" /><span><small>{outfit.curator}</small><strong>{outfit.title}</strong><b>{outfit.productIds.length} pieces</b></span></button>)}</div>
      </div>
      <nav className="shop-shortcuts" aria-label="Shop shortcuts">
        <button onClick={() => setShopFilters(current => ({ ...current, location: profile.city }))}><span>Near you</span><small>{products.filter(product => product.location === profile.city).length} pieces in {profile.city}</small><b>→</b></button>
        <button onClick={() => { setSort("Recommended"); setShopFilters({ ...DEFAULT_SHOP_FILTERS }); }}><span>Recommended</span><small>Picked around your style</small><b>→</b></button>
        <button onClick={() => openProduct(selectedId)}><span>Recently viewed</span><small>{selected.name}</small><b>→</b></button>
      </nav>
    </section>}
    <div className="chip-row">{shopCategories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
    {activeFilterCount > 0 && <div className="active-filter-row" aria-label="Active filters">
      {Object.entries(shopFilters).flatMap(([key, value]) => value === DEFAULT_SHOP_FILTERS[key as keyof ShopFilterState] ? [] : [<button key={key} onClick={() => setShopFilters((current) => ({ ...current, [key]: DEFAULT_SHOP_FILTERS[key as keyof ShopFilterState] }))}>{value}<span>×</span></button>])}
      <button className="clear-filters" onClick={resetShopFilters}>Clear all</button>
    </div>}
    <div className="result-line"><span><b>{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</b>{shopFilters.location !== DEFAULT_SHOP_FILTERS.location ? ` · ${shopFilters.location}` : ""}</span><button onClick={() => setFiltersOpen(true)}>Sort &amp; filter · {sort}</button></div>
    {filtered.length ? grid(filtered) : <div className="empty"><h2>No pieces found</h2><p>Try a broader search or clear your filters.</p><button onClick={clearShopDiscovery} className="gradient-button">Clear all filters</button></div>}
  </>;
  else if (view === "stores") {
    const visibleStores = seededDesignerNames.filter((name) =>
      `${name} ${designerSummaries[name].location}`.toLowerCase().includes(storeQuery.toLowerCase().trim()),
    ).sort((a, b) => Number(b === featuredDesigner) - Number(a === featuredDesigner));
    content = <>
      {header("Stores")}
      <section className="stores-intro">
        <small>SHOP THEIR WORLD</small><h1>Stores on StylishMe</h1>
        <p>Discover selected Namibian designers, boutiques, brands and merch collections.</p>
        <div className="search-wrap"><input value={storeQuery} onChange={(event) => setStoreQuery(event.target.value)} placeholder="Search stores and designers" /></div>
      </section>
      <section className="stores-featured" aria-label="StylishMe stores">
        {visibleStores.map((name) => {
          const summary = designerSummaries[name];
          const count = products.filter((product) => product.designer === name).length;
          return <button key={name} onClick={() => openDesigner(name, "stores")}>
            <img src={summary.image} alt="" />
            <span><small>{summary.location}, Namibia</small><strong>{name}</strong><b>{count} pieces · View store →</b></span>
          </button>;
        })}
      </section>
      {!visibleStores.length && <div className="empty"><h2>No store found</h2><p>Try searching the seller’s full name.</p></div>}
    </>;
  }
  else if (view === "seller-directory") content = <>
    {header(sellerDirectoryDetails.heading, "shop")}
    <section className="seller-directory-hero">
      <small>EXPLORE SELLERS</small>
      <h1>{sellerDirectoryDetails.heading}</h1>
      <p>{sellerDirectoryDetails.description}</p>
    </section>
    <section className="seller-directory-list" aria-label={`${sellerDirectoryDetails.heading} directory`}>
      {sellerDirectoryNames.map((name) => {
        const sellerProducts = products.filter((product) => product.designer === name && (sellerLane === "Merch" ? product.sellerType === "Merch" : true));
        const summary = designerSummaries[name] ?? designerSummaries["Omutima Studio"];
        return <article className="seller-directory-card" key={name}>
          <button className="seller-directory-main" aria-label={`Explore ${name}`} onClick={() => openDesigner(name, "seller-directory")}>
            <img src={summary.image} alt="" />
            <span><small>{summary.location}, Namibia</small><h2>{name}</h2><p>{sellerProducts.length} {sellerProducts.length === 1 ? "piece" : "pieces"} in this edit</p><b>View profile →</b></span>
          </button>
          <div className="seller-product-preview">
            {sellerProducts.slice(0, 3).map((product) => <button key={product.id} aria-label={`Open ${product.name}`} onClick={() => openProduct(product.id, "seller-directory")}><img src={product.image} alt="" /></button>)}
          </div>
        </article>;
      })}
    </section>
  </>;
  else if (view === "product") content = <>
    <div className="product-hero" style={{ background: `radial-gradient(circle at 50% 20%, ${selectedColor}88, #17171d 66%)` }}><div className="floating-actions"><button onClick={() => navigate(productReturnView)} className="circle-btn" aria-label="Go back">‹</button><div><button onClick={() => toggleWishlist(selected.id)} className="circle-btn" aria-label={wishlist.includes(selected.id) ? "Remove from wishlist" : "Save to wishlist"}>{wishlist.includes(selected.id) ? "♥" : "♡"}</button><button className="circle-btn" aria-label="Share product" onClick={() => void shareProduct(selected)}><Icon name="share" /></button>{cartButton()}</div></div><img src={selectedProductImage} alt={selected.name} /><div className="product-gallery-strip" aria-label="Product images">{selectedGallery.map((image, index) => <button key={image} className={selectedProductImage === image ? "active" : ""} aria-label={`View product image ${index + 1}`} onClick={() => setSelectedProductImage(image)}><img src={image} alt="" /></button>)}</div></div>
    <section className="product-details"><div className="badge-row">{selected.badge && <span className="badge">{selected.badge}</span>}{selected.madeToOrder && <span className="badge lilac">Made to order</span>}</div><button className="designer-link" onClick={() => openDesigner(selected.designer, "product")}>{selected.designer}<span>{designerSummaries[selected.designer]?.location ?? selected.location} · Verified</span></button><h1>{selected.name}</h1><div className="price-line"><strong>{money(selected.price)}</strong><span>★ 4.8 (128)</span></div>
      <h3>Colour</h3><div className="swatches">{selected.colors.map(color => <button key={color} aria-label={`Select ${color}`} onClick={() => setSelectedColor(color)} className={selectedColor === color ? "active" : ""} style={{ background: color }} />)}</div>
      <div className="size-head"><h3>Size</h3><button onClick={() => setSizeGuideOpen(true)}>Size guide</button></div><div className="sizes">{selected.sizes.map((size, i) => <button key={size} disabled={!selected.stock[i]} className={selectedSize === size ? "active" : ""} onClick={() => setSelectedSize(size)}>{size}{!selected.stock[i] && <small>Sold</small>}</button>)}</div>
      <div className="fit-note"><strong>Fit Passport recommends {profile.size}</strong><span>Based on your saved size and this item&apos;s {selected.fit.toLowerCase()} fit. Recommendation only.</span></div>
      <div className="info-card"><span>Delivering to {profile.city}</span><strong>{selected.delivery} · N$65</strong>{selected.pickup && <small>Free store collection available</small>}</div>
      <p>{selected.description}</p><ul className="details-list"><li>Material <strong>{selected.material}</strong></li><li>Fit <strong>{selected.fit}</strong></li><li>Model wears <strong>{selected.category === "Shoes" ? "EU 39" : "Size M · 174 cm"}</strong></li><li>Care <strong>Cold gentle wash</strong></li><li>Returns <strong>Eligible within 14 days</strong></li></ul>
      {selected.stock[selected.sizes.indexOf(selectedSize)] === 0 && <div className="request-box"><strong>Your size is unavailable</strong><button onClick={() => setToast("Size request saved")}>Request this size</button></div>}
      <section className="product-reviews" aria-labelledby="product-reviews-title"><div className="section-title"><div><small>VERIFIED CUSTOMERS</small><h2 id="product-reviews-title">Loved for the fit</h2></div><strong>4.8</strong></div><div className="rating-summary"><span><b style={{ width: "92%" }} /></span><small>128 reviews · 94% recommend</small></div><article><div><strong>ND</strong><span><b>Ndeshi</b><small>Verified purchase · Size M</small></span><em>★★★★★</em></div><p>Beautiful weight and colour. The Fit Passport recommendation was right for the relaxed shape I wanted.</p></article></section>
      <section className="complete-look" aria-labelledby="complete-look-title"><div className="section-title"><h2 id="complete-look-title">Complete the Look</h2><button onClick={() => startTryOn([selected.id, ...completeTheLook.map((product) => product.id)], "style")}>Style this piece</button></div><div>{completeTheLook.map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id, "shop")} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div></section>
    </section><div className="sticky-action product-sticky-action"><button onClick={() => startTryOn([selected.id], "try-on")} className="outline-button">Try On this piece</button><button onClick={() => addToCart()} className="gradient-button">Add to cart · {money(selected.price)}</button></div>
  </>;
  else if (view === "designer") content = <>{header(selectedDesigner, designerReturnView)}<section className="designer-cover"><img src={selectedDesignerSummary.image} alt={`${selectedDesigner} studio`} /><div className="seal">MADE IN<br />NAMIBIA</div><h1>{selectedDesigner}</h1><p>{selectedDesignerSummary.location}, Namibia · Verified designer</p><div><strong>{designerProducts.length}<small>Pieces</small></strong><strong>{selectedDesignerSummary.rating}<small>Rating</small></strong><strong>{selectedDesignerSummary.followers}<small>Followers</small></strong><strong>{selectedDesignerSummary.delivery}<small>Delivery</small></strong></div><button aria-pressed={followedDesigners.includes(selectedDesigner)} onClick={toggleDesignerFollow}>{followedDesigners.includes(selectedDesigner) ? "Following" : "Follow"}</button></section><section className="story-copy"><small>THE STORY</small><h2>{selectedDesignerSummary.storyTitle}</h2><p>{selectedDesignerSummary.story}</p></section>{grid(designerProducts)}</>;
  else if (view === "try-on") content = <>{header(tryOnIntent === "style" ? "Style Me" : "Try On")}<TryOnView
    key={`${tryOnIntent}-${tryOnProductIds.join("-")}`}
    products={products}
    initialProductIds={tryOnProductIds}
    initialIntent={tryOnIntent}
    onOpenProduct={(id) => openProduct(id, "try-on")}
    onAddProduct={(id) => { const product = productById.get(id); if (product) quickAddWishlistItem(product); }}
    onAddLook={addTryOnProductsToCart}
    onContinueShopping={() => navigate("shop")}
    isSignedIn={Boolean(user)}
    signInUrl="/login?returnTo=/"
  /></>;
  else if (view === "wishlist") content = <>{header("Wishlist")}<section aria-labelledby="saved-pieces-title"><div className="section-title wishlist-section-title"><div><small>YOUR PERSONAL EDIT</small><h2 id="saved-pieces-title">Saved pieces</h2></div><span>{wishlist.length}</span></div><div className="wishlist-grid">{wishlist.flatMap(id => { const p = productById.get(id); if (!p) return []; return [<article className="wishlist-product-card" key={id}><button className="wishlist-product-image" aria-label={`Open ${p.name}`} onClick={() => openProduct(id)}><img src={p.image} alt={p.name} />{p.badge && <span className="badge">{p.badge}</span>}</button><button className="wishlist-remove" onClick={() => toggleWishlist(id)} aria-label={`Remove ${p.name} from wishlist`}>♥</button><div className="wishlist-product-copy"><small>{p.designer}</small><button onClick={() => openProduct(id)}>{p.name}</button><strong>{money(p.price)}</strong></div><div className="wishlist-actions"><button onClick={() => startTryOn([p.id])} aria-label={`Try on ${p.name}`}>Try On</button><button onClick={() => quickAddWishlistItem(p)} aria-label={`Add ${p.name} to cart`}>Add to bag</button></div></article>]; })}{!wishlist.length && <div className="empty compact-empty"><h2>Your wishlist is waiting</h2><button className="gradient-button" onClick={() => navigate("shop")}>Discover pieces</button></div>}</div></section>{savedOutfits.length > 0 && <section className="saved-look-section" aria-labelledby="saved-looks-title"><div className="section-title wishlist-section-title"><h2 id="saved-looks-title">Saved looks</h2><span>{savedOutfits.length}</span></div><div className="saved-look-list">{savedOutfits.flatMap((id) => { const outfit = OUTFITS.find((item) => item.id === id); if (!outfit) return []; return [<article className="saved-look-card" key={outfit.id}><button className="saved-look-main" aria-label={`Open ${outfit.title}`} onClick={() => openOutfit(outfit.id)}><img src={outfit.image} alt="" /><span><small>{outfit.location}</small><strong>{outfit.title}</strong><b>{outfit.productIds.length} pieces</b></span></button><div><button className="outline-button" aria-label={`Try on ${outfit.title}`} onClick={() => startTryOn(outfit.productIds)}>Try On</button><button aria-label={`Remove ${outfit.title} from saved looks`} onClick={() => toggleSavedOutfit(outfit.id)}>♥</button></div></article>]; })}</div></section>}</>;
  else if (view === "cart") content = <>{header("My Cart")}<div className="list-stack">{cart.flatMap((line, index) => { const p = productById.get(line.productId); if (!p) return []; const atStockLimit = line.quantity >= getSizeStock(p, line.size); return [<article className="list-item cart-line" key={`${line.productId}-${line.size}-${line.color}`}><img src={p.image} alt={p.name} /><button onClick={() => openProduct(p.id)}><strong>{p.name}</strong><small>{line.size} · {p.designer}</small><span>{money(p.price)}</span></button><div className="quantity"><button onClick={() => updateQty(index, -1)} aria-label={`Decrease ${p.name} quantity`}>−</button><span aria-label={`${p.name} quantity`}>{line.quantity}</span><button disabled={atStockLimit} onClick={() => updateQty(index, 1)} aria-label={`Increase ${p.name} quantity`}>+</button></div>{atStockLimit && <small className="stock-limit">Maximum available</small>}</article>]; })}</div>{cart.length ? <section className="summary-card"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p><span>Delivery estimate</span><strong>{money(fee)}</strong></p><p className="total"><span>Total</span><strong>{money(subtotal + fee)}</strong></p><button className="gradient-button" onClick={() => navigate("checkout")}>Checkout</button></section> : <div className="empty"><h2>Your cart is empty</h2><p>Discover something made for you.</p><button className="gradient-button" onClick={() => navigate("shop")}>Start shopping</button></div>}</>;
  else if (view === "checkout") { const steps = ["Delivery", delivery === "Store collection" ? "Collection" : "Address", "Payment", "Review"]; content = <>{header("Checkout", "cart")}<div className="stepper">{steps.map((step, i) => <span className={i <= checkoutStep ? "active" : ""} key={step}>{i + 1}<small>{step}</small></span>)}</div><section className="checkout-panel">{checkoutStep === 0 && <><h2>How should we get it to you?</h2>{["Standard delivery", "Express delivery", "Store collection"].map(item => <label key={item}><input type="radio" name="delivery" checked={delivery === item} onChange={() => setDelivery(item)} /><span><strong>{item}</strong><small>{item === "Store collection" ? "Free · ready in 1–2 days" : item === "Express delivery" ? "N$120 · next working day" : "N$65 · 2–4 days"}</small></span></label>)}</>}{checkoutStep === 1 && <><h2>{checkoutDestinationHeading(delivery)}</h2>{delivery === "Store collection" ? <><label className="address-option"><input type="radio" name="collection-store" defaultChecked /><span><strong>Omutima Studio</strong><small>12 Independence Avenue, Windhoek · Free collection</small></span></label><p className="sandbox-note">We will notify you when the order is ready. Collection orders do not use delivery tracking.</p></> : <><label className="address-option"><input type="radio" checked readOnly /><span><strong>{addresses[0]?.label ?? "Home"}</strong><small>{addresses[0] ? `${addresses[0].street}, ${addresses[0].city}` : "Add a delivery address"}</small></span></label><button className="outline-button" onClick={() => { setAddressesReturnView("checkout"); navigate("addresses"); }}>Add another address</button></>}</>}{checkoutStep === 2 && <><h2>Payment method</h2>{demoMode ? <label><input type="radio" name="pay" checked readOnly /><span><strong>Demo payment</strong><small>No real charge in preview mode</small></span></label> : paymentAvailable ? <label><input type="radio" name="pay" checked readOnly /><span><strong>Secure online payment</strong><small>Continue to DPO Pay to choose an available payment method</small></span></label> : <p className="sandbox-note">{paymentConfigLoaded ? "Secure payments are being connected. Checkout is unavailable until the merchant account is activated." : "Checking secure payment availability…"}</p>}</>}{checkoutStep === 3 && <><h2>Review your order</h2>{demoMode ? <p className="sandbox-note">Preview checkout — no real payment will be processed.</p> : <p className="sandbox-note">You will continue to DPO Pay to complete payment securely.</p>}{cart.map(line => <p key={line.productId} className="review-line"><span>{products.find(p => p.id === line.productId)?.name} × {line.quantity}</span><strong>{money((products.find(p => p.id === line.productId)?.price ?? 0) * line.quantity)}</strong></p>)}<p className="review-line total"><span>Total</span><strong>{money(subtotal + fee)}</strong></p></>}</section><div className="checkout-actions">{checkoutStep > 0 && <button onClick={() => setCheckoutStep(s => s - 1)} className="outline-button">Back</button>}<button onClick={() => checkoutStep < 3 ? setCheckoutStep(s => s + 1) : void placeOrder()} className="gradient-button" disabled={placingOrder || checkoutNeedsAddress || (!demoMode && (!paymentConfigLoaded || !paymentAvailable))} aria-busy={placingOrder}>{checkoutNeedsAddress ? "Add a delivery address" : checkoutStep < 3 ? "Continue" : placingOrder ? "Opening secure payment…" : demoMode ? "Place preview order" : !paymentConfigLoaded ? "Checking payment…" : paymentAvailable ? "Continue to secure payment" : "Payments unavailable"}</button></div></>; }
  else if (view === "confirmation") content = <div className="success-screen"><span>✓</span><small>{isCollectionOrder ? "COLLECTION CONFIRMED" : "ORDER CONFIRMED"}</small><h1>{isCollectionOrder ? "We’ll have it ready." : "It’s officially yours."}</h1><p>{isCollectionOrder ? "We will notify you when your order is ready to collect in store." : "Your order is being prepared. Estimated delivery: 18–20 July."}</p><strong>{selectedOrder?.id}</strong><button className="gradient-button" onClick={() => navigate("tracking")}>{isCollectionOrder ? "View collection status" : "Track delivery"}</button><button className="outline-button" onClick={() => navigate("home")}>Continue shopping</button></div>;
  else if (view === "orders") content = <>{header("My Orders", "profile")}<div className="chip-row">{(["Active", "Delivered", "Cancelled"] as const).map((filter) => <button key={filter} className={orderFilter === filter ? "active" : ""} aria-pressed={orderFilter === filter} onClick={() => setOrderFilter(filter)}>{filter}</button>)}</div><div className="order-list">{filteredOrders.map(order => <button key={order.id} onClick={() => { setSelectedOrderId(order.id); navigate("tracking"); }}><small>{order.date}</small><strong>{order.id}</strong><span>{order.status} · {order.fulfilment ?? "Standard delivery"} · {money(order.total)}</span><div>{order.items.slice(0, 3).map(line => <img key={line.productId} src={products.find(p => p.id === line.productId)?.image} alt="" />)}</div></button>)}{!filteredOrders.length && <div className="empty compact-empty"><h2>No {orderFilter.toLowerCase()} orders</h2><p>Your matching orders will appear here.</p></div>}</div></>;
  else if (view === "tracking") {
    const fallbackStatus: Record<string, string> = { "Order confirmed": "new", "Preparing for collection": "preparing", "Ready to collect": "ready_to_collect", "In transit": "in_transit", Delivered: "delivered" };
    const orderFulfilments: OrderFulfilment[] = selectedOrder?.fulfilments?.length ? selectedOrder.fulfilments : [{
      id: `${selectedOrder?.id ?? "preview"}:fulfilment`, orderId: selectedOrder?.id ?? "", storeName: "Store details pending",
      status: fallbackStatus[selectedOrder?.status ?? ""] ?? "new", statusLabel: selectedOrder?.status ?? "Order confirmed",
      fulfilmentMethod: isCollectionOrder ? "collection" : "delivery", subtotal: selectedOrder?.total ?? 0,
      createdAt: demoMode ? "" : "", provider: null, trackingNumber: null, trackingUrl: null, estimatedDeliveryAt: null, events: [],
    }];
    content = <>{header(isCollectionOrder ? "Collection details" : "Order tracking", "orders")}
      <section className={`tracking-head ${isCollectionOrder ? "collection-head" : ""}`}><small>{selectedOrder?.id}</small><h1>{isCollectionOrder ? "Collection status" : "Delivery tracking"}</h1><h2>{selectedOrder?.status ?? "Order confirmed"}</h2><p>{isCollectionOrder ? "Each store will update your collection status here." : "Each store updates its own delivery milestones here."}</p></section>
      {orderFulfilments.map(fulfilment => {
        const definition = trackingPath(fulfilment.fulfilmentMethod);
        const currentIndex = Math.max(0, definition.findIndex(([status]) => status === fulfilment.status));
        return <section className="collection-card" key={fulfilment.id}>
          <small>{fulfilment.fulfilmentMethod === "collection" ? "COLLECTION STORE" : "SELLER DELIVERY"}</small>
          <h2>{fulfilment.storeName}</h2>
          <strong>{fulfilment.statusLabel}</strong>
          {fulfilment.fulfilmentMethod === "collection" ? <p>No courier tracking is used. The confirmed collection address and instructions will appear when the store marks the order ready.</p> : <p>{fulfilment.trackingNumber ? <>{fulfilment.provider?.toUpperCase()} · {fulfilment.trackingNumber}</> : "Courier tracking will appear after this store dispatches your order."}</p>}
          {fulfilment.estimatedDeliveryAt && <p>Estimated arrival {new Date(fulfilment.estimatedDeliveryAt).toLocaleDateString("en-NA")}</p>}
          {fulfilment.trackingUrl && <a className="outline-button full" href={fulfilment.trackingUrl} target="_blank" rel="noreferrer">Open courier tracking</a>}
          <ol className="timeline">{definition.map(([status, label], index) => {
            const event = [...fulfilment.events].reverse().find(item => item.status === status);
            const occurredAt = event?.occurredAt || (index === 0 ? fulfilment.createdAt : "");
            return <li className={index <= currentIndex ? "done" : ""} key={status}><i /><div><strong>{label}</strong><small>{occurredAt ? trackingTime(occurredAt) : index <= currentIndex ? "Confirmed" : "Pending"}{event?.location ? ` · ${event.location}` : ""}</small></div></li>;
          })}</ol>
          {fulfilment.provider === "dhl" && <small>Delivered by DHL Group</small>}
        </section>;
      })}
      <button className="outline-button full" onClick={() => navigate("support")}>Contact support</button>
    </>;
  }  else if (view === "profile") {
    const profileCollections: Array<[string, View]> = [["Style Me", "try-on"], ["My wardrobe", "wardrobe"], ["Wishlist", "wishlist"], ["Saved outfits", "outfits"]];
    content = <>{header("Profile")}<section className="profile-head"><div className="avatar profile-photo">{user ? <img src={user.avatarUrl} alt={`${user.name}'s profile`} /> : "S"}</div><h1>{user?.name ?? "StylishMe preview"}</h1><p>{profile.city}, Namibia</p><div><strong>{orders.length}<small>Orders</small></strong><strong>{wishlist.length}<small>Wishlist</small></strong><strong>{profile.size}<small>Fit size</small></strong></div>{user ? <LogoutButton email={user.email} /> : null}</section><div className="profile-menu profile-collections">{profileCollections.map(([label, target]) => <button key={label} onClick={() => target === "outfits" ? openSavedOutfits() : target === "try-on" ? startTryOn([selected.id], "style") : navigate(target)}><span>{label}</span><small>{label === "Wishlist" ? wishlist.length : label === "Saved outfits" ? savedOutfits.length : label === "Style Me" ? "Your personal edit" : "Your edit"}</small><b>›</b></button>)}</div><div className="profile-menu">{[["My orders", "orders"], ["Saved addresses", "addresses"], ["Fit Passport", "settings"], ["Notifications", "notifications"], ["Help & support", "support"], ["Settings", "settings"]].map(([label, target]) => <button key={label} onClick={() => { if (target === "addresses") setAddressesReturnView("profile"); navigate(target as View); }}><span>{label}</span><b>›</b></button>)}</div></>;
  }
  else if (view === "wardrobe") content = <>{header("My Wardrobe", "profile")}<section className="wardrobe-intro"><small>YOUR STYLE, IN ONE PLACE</small><h1>My Wardrobe</h1><p>Return to the pieces and complete looks you love, then use them to shape what comes next.</p></section><div className="wardrobe-grid"><button onClick={() => navigate("wishlist")}><span>{wishlist.length}</span><strong>Saved pieces</strong><small>Your favourites and try-on starting points</small></button><button onClick={openSavedOutfits}><span>{savedOutfits.length}</span><strong>Saved looks</strong><small>Complete edits ready to revisit</small></button><button onClick={() => navigate("orders")}><span>{orders.length}</span><strong>Previous purchases</strong><small>Pieces from your StylishMe orders</small></button></div><section className="wardrobe-later"><small>DIGITAL WARDROBE</small><h2>Your own clothes, later</h2><p>Owned-item uploads and mix-and-match recommendations are planned after the core shopping and try-on experience is proven.</p></section></>;
  else if (view === "addresses") content = <>{header("Saved Addresses", addressesReturnView)}<div className="address-list">{addresses.map((address, index) => <div className="info-card" key={`${address.label}-${index}`}><strong>{address.label}{index === 0 ? " · Default" : ""}</strong><span>{address.street}</span><small>{address.city}</small><button aria-label={`Edit ${address.label}`} onClick={() => setAddressEditor({ ...address, index })}>Edit</button></div>)}</div><button className="gradient-button full" onClick={() => setAddressEditor({ index: null, label: "", street: "", city: profile.city })}>Add address</button></>
  else if (view === "notifications") content = <>{header("Notifications", "profile")}<div className="notification-list">{Array.from({ length: 10 }, (_, i) => <button key={i} onClick={() => i < 3 ? navigate("tracking") : navigate("shop")}><i className={i < 3 ? "unread" : ""} /><div><strong>{i < 3 ? "Order update" : i < 6 ? "Back in stock" : "New local collection"}</strong><span>{i < 3 ? "Your StylishMe order moved to the next stage." : "A saved piece is ready to discover."}</span><small>{i + 1}h ago</small></div></button>)}</div></>;
  else if (view === "support") content = <>{header("Help & Support", "profile")}{supportTopic ? <section className="support-detail"><button className="text-back" onClick={() => setSupportTopic(null)}>All help topics</button><small>HELP TOPIC</small><h1>{supportTopic}</h1><p>{supportTopics[supportTopic]}</p></section> : <><section className="story-copy"><small>WE&apos;RE HERE TO HELP</small><h1>What do you need?</h1></section><div className="profile-menu">{Object.keys(supportTopics).map(item => <button key={item} onClick={() => setSupportTopic(item)}><span>{item}</span><b>›</b></button>)}</div></>}</>
  else content = <>{header("Settings", "profile")}<section className="settings-card"><h2>Fit Passport</h2>{[["Normal clothing size", "size"], ["Shoe size", "shoe"], ["Preferred fit", "fit"]].map(([label, key]) => <label key={key}><span>{label}</span><input value={profile[key as keyof typeof profile]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} /></label>)}<p>Recommendations are suggestions, not a fit guarantee.</p></section><AccountConnections /><AccountDeletionControl /><section className="settings-card"><label className="switch-row"><span><strong>Data-light mode</strong><small>Reduce imagery and motion</small></span><input type="checkbox" checked={dataLight} onChange={e => setDataLight(e.target.checked)} /></label><label className="switch-row"><span><strong>Order notifications</strong><small>Delivery and collection updates</small></span><input type="checkbox" defaultChecked /></label></section></>;

  if (view === "outfits") {
    const outfitCatalogue = savedOutfitMode
      ? OUTFITS.filter((outfit) => savedOutfits.includes(outfit.id))
      : OUTFITS;
    content = savedOutfitMode && !outfitCatalogue.length
      ? <div className="empty saved-outfits-empty"><h2>No saved outfits yet</h2><p>Save a story or curated look and it will appear here.</p><button className="gradient-button" onClick={() => setSavedOutfitMode(false)}>Browse curated outfits</button></div>
      : <>{header("Shop the Look", "home")}<OutfitsView
        outfits={outfitCatalogue}
        selectedId={selectedOutfitId}
        products={storyProducts}
        savedOutfitIds={savedOutfits}
        replacements={outfitReplacements[selectedOutfitId] ?? {}}
        onSelect={setSelectedOutfitId}
        onSave={toggleSavedOutfit}
        onAddAll={addOutfitToCart}
        onTryOn={startTryOn}
        onReplace={replaceOutfitProduct}
        onOpenProduct={(id) => openProduct(id, "outfits")}
      /></>;
  }

  const mainTabs: Array<[string, View, string]> = [
    ["Home", "home", "home"],
    ["Shop", "shop", "shop"],
    ["Stores", "stores", "shop"],
    ["Try On", "try-on", "sparkles"],
    ["Wishlist", "wishlist", "heart"],
    ["Profile", "profile", "profile"],
  ];
  const designerOrigin = designerReturnView === "product" ? productReturnView : designerReturnView;
  const isMainTabActive = (target: View) =>
    target === view ||
    (target === "shop" && view === "seller-directory") ||
    (target === "stores" && view === "designer" && designerOrigin === "stores") ||
    (target === "home" && view === "designer" && designerOrigin === "home") ||
    (target === "shop" && view === "designer" && ["shop", "search"].includes(designerOrigin)) ||
    (target === "wishlist" && view === "designer" && designerOrigin === "wishlist") ||
    (target === "profile" && view === "designer" && profileViews.includes(designerOrigin)) ||
    (target === "profile" && profileViews.includes(view));
  return (
    <main className={`site-stage ${dataLight ? "data-light" : ""}`}>
      <div
        className="app-shell"
        inert={activeStoryId !== null || activeCustomerStory !== null || storyComposerOpen}
        aria-hidden={activeStoryId !== null || activeCustomerStory !== null || storyComposerOpen ? true : undefined}
      >
        <div className="screen-content">{content}{view === "profile" && <a className="become-seller-banner" href="/?join=seller" aria-label="Become a seller"><span><small>CREATE YOUR STORE</small><strong>Become a seller</strong><b>Open your fashion business on StylishMe</b></span><i>→</i></a>}</div>
        {!["product", "checkout", "confirmation"].includes(view) && (
          <nav className="bottom-nav">
            {mainTabs.map(([label, target, icon]) => {
              const active = isMainTabActive(target);
              return <button key={target} onClick={() => target === "try-on" ? startTryOn([selected.id], "try-on") : navigate(target)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><i><Icon name={icon} /></i><span>{label}</span></button>;
            })}
          </nav>
        )}
      </div>

      {activeStoryId && (
        <OutfitStoryViewer
          key={activeStoryId}
          stories={OUTFIT_STORIES}
          outfits={OUTFITS}
          products={storyProducts}
          initialStoryId={activeStoryId}
          restoreFocusTo={storyTriggerRef.current}
          savedOutfitIds={savedOutfits}
          onSave={toggleSavedOutfit}
          onAddAll={addOutfitToCart}
          onViewOutfit={openOutfit}
          onClose={() => setActiveStoryId(null)}
        />
      )}

      {storyComposerOpen && <CustomerStoryComposer
        eligibleItems={eligibleStoryItems}
        products={products}
        displayName={user?.name ?? ""}
        town={profile.city}
        onPublished={() => { setStoryComposerOpen(false); void refreshCustomerStories(); setToast("Your outfit is now live"); }}
        onClose={() => setStoryComposerOpen(false)}
      />}

      {activeCustomerStory && <CustomerStoryViewer
        story={activeCustomerStory}
        signedIn={Boolean(user)}
        onChange={() => void refreshCustomerStories()}
        onProduct={(id) => { setActiveCustomerStoryId(null); openProduct(id, "home"); }}
        onClose={() => setActiveCustomerStoryId(null)}
      />}

      {filtersOpen && <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)}><section className="filter-sheet" role="dialog" aria-modal="true" aria-label="Shop filters" onClick={e => e.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><h2>Sort &amp; filters</h2><button onClick={resetShopFilters}>Reset</button></div><h3>Sort by</h3><select className="sheet-select" aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option>Recommended</option><option>Price low to high</option><option>Price high to low</option></select><h3>Category</h3><div className="chip-row">{shopCategories.map(item => <button aria-pressed={category === item} className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><h3>Size</h3><div className="chip-row">{["XS", "S", "M", "L", "XL"].map(item => <button aria-pressed={shopFilters.size === item} className={shopFilters.size === item ? "active" : ""} key={item} onClick={() => setShopFilters(current => ({ ...current, size: current.size === item ? DEFAULT_SHOP_FILTERS.size : item }))}>{item}</button>)}</div><h3>Colour</h3><div className="filter-swatches">{filterColors.map(([label, color]) => <button key={color} aria-label={label} aria-pressed={shopFilters.color === color} className={shopFilters.color === color ? "active" : ""} style={{ background: color }} onClick={() => setShopFilters(current => ({ ...current, color: current.color === color ? DEFAULT_SHOP_FILTERS.color : color }))} />)}</div><h3>Price</h3><div className="chip-row">{["Under N$800", "N$800 to N$1,500", "Over N$1,500"].map(item => <button key={item} aria-pressed={shopFilters.price === item} className={shopFilters.price === item ? "active" : ""} onClick={() => setShopFilters(current => ({ ...current, price: current.price === item ? DEFAULT_SHOP_FILTERS.price : item }))}>{item}</button>)}</div><h3>Designer</h3><div className="chip-row">{catalogueDesignerNames.map(item => <button key={item} aria-pressed={shopFilters.designer === item} className={shopFilters.designer === item ? "active" : ""} onClick={() => setShopFilters(current => ({ ...current, designer: current.designer === item ? DEFAULT_SHOP_FILTERS.designer : item }))}>{item}</button>)}</div><h3>Location</h3><div className="chip-row">{shopLocations.map(item => <button key={item} aria-pressed={shopFilters.location === item} className={shopFilters.location === item ? "active" : ""} onClick={() => setShopFilters(current => ({ ...current, location: current.location === item ? DEFAULT_SHOP_FILTERS.location : item }))}>{item}</button>)}</div><h3>Delivery</h3><div className="chip-row">{["Nationwide", "Store collection", "Fast delivery"].map(item => <button key={item} aria-pressed={shopFilters.delivery === item} className={shopFilters.delivery === item ? "active" : ""} onClick={() => setShopFilters(current => ({ ...current, delivery: current.delivery === item ? DEFAULT_SHOP_FILTERS.delivery : item }))}>{item}</button>)}</div><button className="gradient-button full" onClick={() => setFiltersOpen(false)}>Show {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</button></section></div>}
      {pendingOutfitAdd && <div className="sheet-backdrop" onClick={() => setPendingOutfitAdd(null)}><section className="filter-sheet outfit-size-sheet" role="dialog" aria-modal="true" aria-label="Choose outfit sizes" onClick={event => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><div><small>FIT PASSPORT CHECK</small><h2>Choose outfit sizes</h2></div><button onClick={() => setPendingOutfitAdd(null)}>Cancel</button></div><p>Your saved size is unavailable for {pendingOutfitAdd.selectionProductIds.length} {pendingOutfitAdd.selectionProductIds.length === 1 ? "piece" : "pieces"}. Choose a stocked size before adding the look.</p>{pendingOutfitAdd.selectionProductIds.map(productId => { const product = productById.get(productId)!; return <fieldset key={productId}><legend>{product.name}</legend><div className="chip-row">{product.sizes.map((size, index) => product.stock[index] > 0 && <button type="button" key={size} aria-label={`Select ${size} for ${product.name}`} aria-pressed={outfitSizeSelections[product.id] === size} className={outfitSizeSelections[product.id] === size ? "active" : ""} onClick={() => setOutfitSizeSelections(current => ({ ...current, [product.id]: size }))}>{size}<small>{product.stock[index]} left</small></button>)}</div></fieldset>; })}{pendingOutfitAdd.unavailableCount > 0 && <p className="selection-warning">{pendingOutfitAdd.unavailableCount} unavailable {pendingOutfitAdd.unavailableCount === 1 ? "piece will" : "pieces will"} be skipped.</p>}<button className="gradient-button full" disabled={pendingOutfitAdd.selectionProductIds.some(productId => !outfitSizeSelections[productId])} onClick={() => commitOutfitAdd(pendingOutfitAdd.outfitId, outfitSizeSelections, pendingOutfitAdd.productIds)}>Add selected items</button></section></div>}
      {sizeGuideOpen && <div className="sheet-backdrop" onClick={() => setSizeGuideOpen(false)}><section className="filter-sheet utility-sheet" role="dialog" aria-modal="true" aria-label="Size guide" onClick={(event) => event.stopPropagation()}><div className="sheet-title"><div><small>FIT PASSPORT</small><h2>Size guide</h2></div><button aria-label="Close size guide" onClick={() => setSizeGuideOpen(false)}>Close</button></div><h3>Find your best starting size</h3><p>Compare your usual size with the product fit, then use the stock buttons on the product page. Fit Passport recommendations are guidance, not a guarantee.</p><div className="size-guide-grid"><span><strong>XS–S</strong><small>Closer fit</small></span><span><strong>M</strong><small>Regular fit</small></span><span><strong>L–XL</strong><small>Roomier fit</small></span></div><button className="gradient-button full" onClick={() => setSizeGuideOpen(false)}>Use {profile.size} as my starting size</button></section></div>}
      {addressEditor && <div className="sheet-backdrop" onClick={() => setAddressEditor(null)}><section className="filter-sheet utility-sheet address-editor" role="dialog" aria-modal="true" aria-label={addressEditor.index === null ? "Add address" : "Edit address"} onClick={(event) => event.stopPropagation()}><div className="sheet-title"><h2>{addressEditor.index === null ? "Add address" : "Edit address"}</h2><button aria-label="Close address editor" onClick={() => setAddressEditor(null)}>Cancel</button></div><label><span>Address label</span><input aria-label="Address label" value={addressEditor.label} onChange={(event) => setAddressEditor((current) => current ? { ...current, label: event.target.value } : current)} /></label><label><span>Street address</span><input aria-label="Street address" value={addressEditor.street} onChange={(event) => setAddressEditor((current) => current ? { ...current, street: event.target.value } : current)} /></label><label><span>Town or city</span><input aria-label="Town or city" value={addressEditor.city} onChange={(event) => setAddressEditor((current) => current ? { ...current, city: event.target.value } : current)} /></label><button className="gradient-button full" disabled={!addressEditor.label.trim() || !addressEditor.street.trim() || !addressEditor.city.trim()} onClick={saveAddress}>Save address</button></section></div>}
      {toast && <div className="toast" role="status" aria-live="polite" aria-atomic="true">{toast}</div>}
    </main>
  );
}
