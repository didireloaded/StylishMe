"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { productReadiness, productShareUrl, storeShareUrl, totalStock } from "./seller-domain";
import { filterSellerProducts, type SellerProductFilter } from "./unified-domain";

type View = "today" | "collection" | "add" | "orders" | "inventory" | "payouts" | "notifications" | "settings" | "store" | "more";
type Status = "Live" | "Changes requested" | "Draft";
type SellerProduct = {
  id: string; name: string; description: string; category: string; collection: string;
  price: number; salePrice?: number; material: string; fit: string; colours: string[];
  variants: Array<{ size: string; colour: string; quantity: number }>; images: string[];
  delivery: string[]; returns: string; madeToOrder: boolean; status: Status;
};
type SellerState = {
  store: { name: string; type: string; owner: string; city: string; story: string; approved: boolean; email?: string; phone?: string };
  products: SellerProduct[];
};
type SellerUser = { name: string; email: string };
type SettlementState = {
  summary: { availableCents: number; pendingCents: number; inPayoutCents: number; paidCents: number; commissionCents: number };
  batches: Array<{ id: string; amountCents: number; currency: string; status: string; createdAt: string; releasedAt?: string | null }>;
  payoutAccountStatus: string;
};

const images = [
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=84",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=84",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=84",
];
const products: SellerProduct[] = [
  { id: "sp1", name: "Ondelela Evening Dress", description: "A fluid ceremony dress cut and finished in Windhoek.", category: "Women", collection: "Modern Ceremony", price: 2450, material: "Viscose satin", fit: "Regular", colours: ["Coral", "Black"], variants: [{ size: "S", colour: "Coral", quantity: 2 }, { size: "M", colour: "Coral", quantity: 4 }, { size: "L", colour: "Black", quantity: 1 }], images: [images[0]], delivery: ["Nationwide delivery", "Store collection"], returns: "14 days", madeToOrder: true, status: "Live" },
  { id: "sp2", name: "Walvis Linen Co-ord", description: "Breathable tailoring designed for relaxed weekends along the coast.", category: "Women", collection: "Coastline Weekend", price: 1399, salePrice: 1199, material: "Linen blend", fit: "Relaxed", colours: ["Sand"], variants: [{ size: "S", colour: "Sand", quantity: 1 }, { size: "M", colour: "Sand", quantity: 2 }], images: [images[1]], delivery: ["Nationwide delivery"], returns: "14 days", madeToOrder: false, status: "Live" },
  { id: "sp3", name: "Lilac Ceremony Set", description: "A polished two-piece set for celebrations.", category: "Women", collection: "Modern Ceremony", price: 2190, material: "Crepe", fit: "Tailored", colours: ["Lilac"], variants: [{ size: "M", colour: "Lilac", quantity: 0 }], images: [images[2]], delivery: ["Store collection"], returns: "Made-to-order pieces are final sale", madeToOrder: true, status: "Changes requested" },
];
const initialState: SellerState = {
  store: { name: "Omutima Studio", type: "Designer", owner: "Maria", city: "Windhoek", story: "Soft tailoring and expressive colour, designed for modern Namibian life.", approved: true },
  products,
};
const blank = (): SellerProduct => ({ id: "", name: "", description: "", category: "Women", collection: "", price: 0, material: "", fit: "Regular", colours: ["Coral"], variants: [{ size: "M", colour: "Coral", quantity: 1 }], images: [], delivery: ["Nationwide delivery"], returns: "14 days", madeToOrder: false, status: "Draft" });

function Icon({ name }: { name: string }) {
  const path: Record<string, string> = {
    home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
    collection: "M4 5h16v14H4zM8 5V3h8v2M8 10h8M8 14h5",
    plus: "M12 5v14M5 12h14",
    orders: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5",
    store: "M4 9h16l-1 12H5L4 9ZM7 9l1-5h8l1 5",
    share: "M12 16V3m0 0L7 8m5-5 5 5M5 12v9h14v-9",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={path[name]} /></svg>;
}

export default function SellerApp({
  user = { name: "Maria", email: "preview@stylishme.na" },
  demoMode = false,
}: {
  user?: SellerUser;
  demoMode?: boolean;
}) {
  const [view, setView] = useState<View>("today");
  const [state, setState] = useState<SellerState>(initialState);
  const [draft, setDraft] = useState<SellerProduct>(blank);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState("");
  const [productFilter, setProductFilter] = useState<SellerProductFilter>("All");
  const [stockReason, setStockReason] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [settlement, setSettlement] = useState<SettlementState | null>(null);
  const [newStore, setNewStore] = useState({ name: "", type: "Designer", owner: user.name, city: "Windhoek", email: user.email, phone: "" });

  useEffect(() => {
    if (demoMode) return;
    fetch("/api/seller-state").then(async (response) => {
      const data = await response.json() as { state?: SellerState | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to open your store");
      return data;
    }).then(data => {
      if (data.state) setState(data.state);
      else setNeedsSetup(true);
    }).catch((error) => {
      setNeedsSetup(true);
      setToast(error instanceof Error ? error.message : "Unable to open your store");
    }).finally(() => setLoading(false));
  }, [demoMode]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (demoMode || view !== "payouts") return;
    void fetch("/api/seller-settlements", { cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Unable to load payouts"); return body; })
      .then(setSettlement)
      .catch(error => setToast(error instanceof Error ? error.message : "Unable to load payouts"));
  }, [demoMode, view]);
  const save = async (next: SellerState) => {
    setState(next);
    if (demoMode) {
      setToast("Saved inside this preview");
      return true;
    }
    try {
      const response = await fetch("/api/seller-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: next }),
      });
      const body = await response.json() as { state?: SellerState; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to save your store");
      if (body.state) setState(body.state);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to save your store");
      return false;
    }
  };
  const finishSetup = async (event: FormEvent) => {
    event.preventDefault();
    if (!newStore.name.trim() || !newStore.owner.trim() || !newStore.email.trim()) return setToast("Add your name, store and email");
    const next: SellerState = { store: { ...newStore, story: "", approved: false }, products: [] };
    if (await save(next)) {
      setNeedsSetup(false);
      setToast("Your store is ready to complete");
    }
  };

  if (loading) return <main className="seller-stage"><div className="seller-app onboarding-app"><header className="seller-header"><div className="wordmark"><span>STYLISHME</span><small>SELLER</small></div></header><section className="onboarding-copy"><small>YOUR STORE</small><h1>Preparing your seller space.</h1><p>Loading your collection and store details securely.</p></section></div></main>;

  if (needsSetup) return <main className="seller-stage"><div className="seller-app onboarding-app"><header className="seller-header"><div className="wordmark"><span>STYLISHME</span><small>SELLER</small></div></header><section className="onboarding-copy"><small>YOUR INVITATION</small><h1>Welcome to StylishMe Seller</h1><p>Create the store customers will discover inside StylishMe.</p></section><form className="form-card onboarding-form" onSubmit={finishSetup}><h2>Set up your store</h2><label>Your name<input value={newStore.owner} onChange={e => setNewStore({ ...newStore, owner: e.target.value })} /></label><label>Store or brand name<input value={newStore.name} onChange={e => setNewStore({ ...newStore, name: e.target.value })} /></label><div className="form-pair"><label>What do you sell?<select value={newStore.type} onChange={e => setNewStore({ ...newStore, type: e.target.value })}><option>Designer</option><option>Brand or boutique</option><option>Merch</option></select></label><label>Location<input value={newStore.city} onChange={e => setNewStore({ ...newStore, city: e.target.value })} /></label></div><div className="form-pair"><label>Email<input type="email" value={newStore.email} onChange={e => setNewStore({ ...newStore, email: e.target.value })} /></label><label>Phone number<input value={newStore.phone} onChange={e => setNewStore({ ...newStore, phone: e.target.value })} /></label></div><button className="primary" type="submit">Continue to your store</button></form>{toast && <div className="seller-toast" role="status">{toast}</div>}</div></main>;

  const live = state.products.filter(p => p.status === "Live");
  const low = state.products.filter(p => totalStock(p.variants) < 3);
  const pieces = state.products.reduce((sum, p) => sum + totalStock(p.variants), 0);
  const visibleProducts = filterSellerProducts(state.products, productFilter);
  const ready = productReadiness(draft);
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const copy = async (value: string, message: string) => { try { await navigator.clipboard.writeText(value); } catch {} setToast(message); };
  const adjustStock = async (productId: string, variantIndex: number, change: number) => {
    if (!stockReason.trim()) return setToast("Choose a reason before changing stock");
    const next = { ...state, products: state.products.map(product => product.id !== productId ? product : ({ ...product, variants: product.variants.map((variant, index) => index !== variantIndex ? variant : ({ ...variant, quantity: Math.max(0, variant.quantity + change) })) })) };
    if (await save(next)) setToast(`Stock updated · ${stockReason}`);
  };
  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    if (demoMode) {
      const uploaded = files.slice(0, 5).map(file => URL.createObjectURL(file));
      setDraft(current => ({ ...current, images: uploaded }));
      setToast(`${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} added to the preview`);
      return;
    }
    setToast("Adding your photos…");
    try {
      const uploaded = await Promise.all(files.slice(0, 5).map(async (file) => {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/seller-images", { method: "POST", body: form });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to add photo");
        return result.url;
      }));
      setDraft(current => ({ ...current, images: uploaded }));
      setToast(`${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} added`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to add photos");
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready.ready) return setToast("Complete the missing details first");
    const next = { ...draft, id: draft.id || `seller-${Date.now()}`, status: "Live" as const };
    void save({ ...state, products: draft.id ? state.products.map(p => p.id === draft.id ? next : p) : [next, ...state.products] });
    setDraft(blank()); setStep(0); go("collection"); setToast("Quality checks passed — your piece is live");
  };
  const header = (title?: string) => <header className="seller-header"><button className="wordmark" onClick={() => go("today")}><span>STYLISHME</span><small>SELLER</small></button>{title && <strong>{title}</strong>}<button className="avatar" onClick={() => go("store")} aria-label="Open store profile">OS</button></header>;

  let content;
  if (view === "today") content = <>
    {header()}
    <section className="welcome"><div><small>GOOD MORNING</small><h1>Good morning, {state.store.owner}.</h1><p>Here is what is happening with your store today.</p></div><span>{state.store.approved ? "Store open" : "Finish setup"}</span></section>
    <section className="editorial-hero"><img src={(live[0] ?? state.products[0])?.images[0] ?? images[0]} alt="" /><div><small>YOUR SHOP TODAY</small><h2>{pieces} pieces ready to be discovered.</h2><p>{live.length} published products · {low.length} need stock attention</p><button onClick={() => go("add")}>Add product</button></div></section>
    <section className="seller-performance" aria-labelledby="seller-performance-title"><div className="section-title"><div><small>STORE PERFORMANCE</small><h2 id="seller-performance-title">Truthful business signals.</h2></div></div><div><article><small>Sales</small><strong>Sales unavailable</strong><span>Payment provider not connected</span></article><article><small>Published</small><strong>{live.length}</strong><span>{state.products.length} total products</span></article><article><small>Available units</small><strong>{pieces}</strong><span>{low.length} low-stock products</span></article></div></section>
    <section><div className="section-title"><div><small>AT A GLANCE</small><h2>Marketplace status</h2></div><button onClick={() => go("collection")}>View products</button></div><div className="status-stories">{[["Published", live.length], ["Needs details", state.products.filter(p => p.status === "Changes requested").length], ["Low stock", low.length], ["Orders", 0]].map(([label, value]) => <button key={label} onClick={() => go(label === "Orders" ? "orders" : label === "Low stock" ? "inventory" : "collection")}><span>{value}</span><small>{label}</small></button>)}</div></section>
    <section><div className="section-title"><div><small>NEEDS ATTENTION</small><h2>Clear work for today.</h2></div></div><div className="attention-list">{low.length > 0 && <button onClick={() => go("inventory")}><i className="coral" /><div><strong>{low.length} {low.length === 1 ? "product is" : "products are"} almost out of stock</strong><small>Open variant inventory and record a reason for every adjustment.</small></div><b>→</b></button>}{state.products.some(p => p.status === "Changes requested") && <button onClick={() => go("collection")}><i className="lilac" /><div><strong>Product details need changes</strong><small>Complete the listing before it can publish.</small></div><b>→</b></button>}{!low.length && !state.products.some(p => p.status === "Changes requested") && <div className="seller-empty"><strong>Nothing urgent right now</strong><small>New orders and stock issues will appear here when real records are available.</small></div>}</div></section>
    <section className="share-card"><div><small>YOUR STOREFRONT</small><h2>Share your store</h2><p>Send customers directly to your StylishMe collection.</p></div><button onClick={() => copy(storeShareUrl(state.store.name), "Store link copied")}><Icon name="share" /> Copy link</button></section>
  </>;
  else if (view === "collection") content = <>
    {header("Your collection")}<section className="page-intro"><small>YOUR PIECES</small><h1>Your collection</h1><p>Published pieces and anything that still needs a detail before it can go live.</p><button className="primary" onClick={() => go("add")}>Add a new piece</button></section>
    <div className="filter-chips">{(["All", "Live", "Needs details", "Needs attention"] as SellerProductFilter[]).map(label => <button key={label} className={productFilter === label ? "active" : ""} aria-pressed={productFilter === label} onClick={() => setProductFilter(label)}>{label}</button>)}</div>
    <section className="seller-product-grid">{visibleProducts.map(product => <article key={product.id} className="seller-product-card"><div className="product-photo"><img src={product.images[0] || images[0]} alt={product.name} /><span className={`status ${product.status.toLowerCase().replaceAll(" ", "-")}`}>{product.status}</span></div><div className="product-copy"><small>{product.collection || product.category}</small><h2>{product.name}</h2><strong>N${product.price.toLocaleString()}</strong><p>{totalStock(product.variants)} in stock</p></div><div className="product-actions"><button onClick={() => copy(productShareUrl(state.store.name, product.name), "Product link copied")}><Icon name="share" /> Share</button><button onClick={() => { setDraft(product); setStep(0); go("add"); }}>Edit</button></div></article>)}</section>
  </>;
  else if (view === "add") content = <>
    {header(draft.id ? "Edit piece" : "Add a new piece")}<section className="page-intro compact"><small>BUILD THE PRODUCT PAGE</small><h1>{draft.id ? "Refine this piece" : "Add a new piece"}</h1><p>Give customers everything they need to choose confidently.</p></section>
    <div className="form-progress">{["The piece", "Options & stock", "Delivery", "Review"].map((label, index) => <button key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => setStep(index)}><span>{index + 1}</span><small>{label}</small></button>)}</div>
    <form className="piece-form" onSubmit={submit}>
      {step === 0 && <section className="form-card"><h2>Tell the story of this piece</h2><label>Product photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => void uploadImages([...(e.target.files ?? [])])} /></label>{draft.images.length > 0 && <div className="photo-preview">{draft.images.slice(0, 3).map(image => <img key={image} src={image} alt="" />)}</div>}<label>Product name<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Ondelela Evening Dress" /></label><label>Description<textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Describe the shape, feeling and details." /></label><div className="form-pair"><label>Category<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{["Women", "Men", "Kids", "Shoes", "Accessories", "Traditional wear", "Merch"].map(v => <option key={v}>{v}</option>)}</select></label><label>Collection<input value={draft.collection} onChange={e => setDraft({ ...draft, collection: e.target.value })} placeholder="Collection name" /></label></div><div className="form-pair"><label>Price (N$)<input type="number" value={draft.price || ""} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} /></label><label>Sale price<input type="number" value={draft.salePrice || ""} onChange={e => setDraft({ ...draft, salePrice: Number(e.target.value) || undefined })} /></label></div></section>}
      {step === 1 && <section className="form-card"><h2>Sizes, colours and stock</h2><div className="form-pair"><label>Material<input value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} /></label><label>Fit<select value={draft.fit} onChange={e => setDraft({ ...draft, fit: e.target.value })}>{["Regular", "Relaxed", "Tailored", "Oversized", "Close fit"].map(v => <option key={v}>{v}</option>)}</select></label></div><label>Colours<input value={draft.colours.join(", ")} onChange={e => setDraft({ ...draft, colours: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} /></label><div className="variant-head"><h3>Stock by size</h3><button type="button" onClick={() => setDraft(current => ({ ...current, variants: [...current.variants, { size: "M", colour: current.colours[0] || "Default", quantity: 1 }] }))}>+ Add size</button></div>{draft.variants.map((variant, index) => <div className="variant-row" key={index}><input value={variant.size} aria-label={`Size ${index + 1}`} onChange={e => setDraft(current => ({ ...current, variants: current.variants.map((v, i) => i === index ? { ...v, size: e.target.value } : v) }))} /><select value={variant.colour} onChange={e => setDraft(current => ({ ...current, variants: current.variants.map((v, i) => i === index ? { ...v, colour: e.target.value } : v) }))}>{draft.colours.map(colour => <option key={colour}>{colour}</option>)}</select><input type="number" min="0" value={variant.quantity} aria-label={`Quantity ${index + 1}`} onChange={e => setDraft(current => ({ ...current, variants: current.variants.map((v, i) => i === index ? { ...v, quantity: Number(e.target.value) } : v) }))} /></div>)}<div className="stock-total"><span>Total available</span><strong>{totalStock(draft.variants)}</strong></div></section>}
      {step === 2 && <section className="form-card"><h2>Delivery and returns</h2>{["Nationwide delivery", "Windhoek delivery", "Store collection"].map(option => <label className="check-row" key={option}><input type="checkbox" checked={draft.delivery.includes(option)} onChange={() => setDraft(current => ({ ...current, delivery: current.delivery.includes(option) ? current.delivery.filter(v => v !== option) : [...current.delivery, option] }))} /><span>{option}</span></label>)}<label className="check-row"><input type="checkbox" checked={draft.madeToOrder} onChange={e => setDraft({ ...draft, madeToOrder: e.target.checked })} /><span>This piece can be made to order</span></label><label>Return information<textarea value={draft.returns} onChange={e => setDraft({ ...draft, returns: e.target.value })} /></label></section>}
      {step === 3 && <section className="form-card review-card"><small>READY FOR STYLISHME</small><h2>{draft.name || "Untitled piece"}</h2>{draft.images[0] && <img src={draft.images[0]} alt="" />}<dl><div><dt>Price</dt><dd>N${draft.price.toLocaleString()}</dd></div><div><dt>Stock</dt><dd>{totalStock(draft.variants)} pieces</dd></div><div><dt>Delivery</dt><dd>{draft.delivery.join(", ")}</dd></div></dl>{!ready.ready && <p className="missing">Still needed: {ready.missing.join(", ")}.</p>}<p>StylishMe checks the details, stock and images. When every quality check passes, the piece becomes visible automatically.</p></section>}
      <div className="form-actions">{step > 0 && <button type="button" onClick={() => setStep(v => v - 1)}>Back</button>}{step < 3 ? <button type="button" className="primary" onClick={() => setStep(v => v + 1)}>Continue</button> : <button type="submit" className="primary" disabled={!ready.ready}>Publish product</button>}</div>
    </form>
  </>;
  else if (view === "orders") content = <>
    {header("Orders")}<section className="page-intro"><small>OPERATIONAL CENTRE</small><h1>Orders</h1><p>Only orders containing products from {state.store.name} will appear here.</p></section><div className="filter-chips">{["Needs action", "Confirmed", "Preparing", "Ready for pickup", "Shipped", "Completed", "Returns", "Cancelled"].map((label, index) => <button key={label} className={index === 0 ? "active" : ""}>{label}</button>)}</div><section className="seller-empty large"><strong>No seller orders recorded</strong><small>The marketplace does not yet store seller-specific fulfilment records. No sample customer names or orders are shown.</small></section>
  </>;
  else if (view === "inventory") content = <>
    {header("Inventory")}<section className="page-intro"><small>VARIANT CONTROL</small><h1>Stock by variant</h1><p>Update the exact size and colour. Every adjustment needs a reason.</p></section><section className="inventory-summary"><article><small>AVAILABLE</small><strong>{pieces}</strong></article><article><small>LOW STOCK</small><strong>{state.products.flatMap(p => p.variants).filter(v => v.quantity > 0 && v.quantity < 3).length}</strong></article><article><small>OUT OF STOCK</small><strong>{state.products.flatMap(p => p.variants).filter(v => v.quantity === 0).length}</strong></article></section><label className="stock-reason">Adjustment reason<select value={stockReason} onChange={e => setStockReason(e.target.value)}><option value="">Choose a reason</option><option>Stock received</option><option>Damaged</option><option>Returned</option><option>Correction</option><option>Transferred</option></select></label><section className="inventory-list">{state.products.flatMap(product => product.variants.map((variant, index) => <article key={`${product.id}-${index}`}><div><strong>{product.name}</strong><small>{variant.colour} / {variant.size}</small></div><span className={variant.quantity < 3 ? "low" : ""}>{variant.quantity} available</span><div><button aria-label={`Remove one ${product.name} ${variant.size}`} onClick={() => void adjustStock(product.id, index, -1)}>−</button><button aria-label={`Add one ${product.name} ${variant.size}`} onClick={() => void adjustStock(product.id, index, 1)}>+</button></div></article>))}{!state.products.length && <div className="seller-empty"><strong>No inventory yet</strong><small>Add your first product to begin tracking stock.</small></div>}</section>
  </>;
  else if (view === "payouts") content = <>
    {header("Payouts")}<section className="page-intro"><small>YOUR EARNINGS</small><h1>Payouts</h1><p>Balances are calculated only from verified customer payments, seller-specific refunds and completed return windows.</p></section>
    {demoMode ? <section className="seller-empty large"><strong>Payout preview</strong><small>No invented financial figures are shown in the demo.</small></section> : !settlement ? <section className="seller-empty large"><strong>Loading verified balances…</strong></section> : <>
      <section className="inventory-summary"><article><small>AVAILABLE AFTER RETURNS</small><strong>N${(settlement.summary.availableCents / 100).toLocaleString()}</strong></article><article><small>PENDING</small><strong>N${(settlement.summary.pendingCents / 100).toLocaleString()}</strong></article><article><small>IN PAYOUT</small><strong>N${(settlement.summary.inPayoutCents / 100).toLocaleString()}</strong></article></section>
      <section className="form-card"><h2>Payout account</h2><p>{settlement.payoutAccountStatus === "verified" ? "Verified for marketplace settlements." : "Not connected. Funds stay held by StylishMe until a verified payout account and regulated transfer process are active."}</p><small>Paid to date: N${(settlement.summary.paidCents / 100).toLocaleString()} · StylishMe commission: N${(settlement.summary.commissionCents / 100).toLocaleString()}</small></section>
      <section className="inventory-list">{settlement.batches.map(batch => <article key={batch.id}><div><strong>N${(batch.amountCents / 100).toLocaleString()}</strong><small>{new Date(batch.createdAt).toLocaleDateString("en-NA")} · {batch.status.replaceAll("_", " ")}</small></div></article>)}{!settlement.batches.length && <div className="seller-empty"><strong>No payout batches yet</strong><small>Eligible verified sales will appear after fulfilment and the return window.</small></div>}</section>
    </>}
  </>;
  else if (view === "notifications") content = <>{header("Notifications")}<section className="page-intro"><small>STORE UPDATES</small><h1>Notifications</h1><p>Urgent orders, stock, product and payout updates will be separated here.</p></section><section className="seller-empty large"><strong>You are all caught up</strong><small>No real seller notifications have been recorded.</small></section></>;
  else if (view === "settings") content = <>{header("Settings")}<section className="page-intro"><small>STORE OPERATIONS</small><h1>Settings</h1><p>Account security remains managed through your signed-in account. Store details and inventory are private to this seller.</p></section><section className="form-card"><h2>Low-stock preference</h2><p>Products with fewer than 3 available units are highlighted. More operational controls will appear when their backend services exist.</p></section></>;
  else if (view === "more") content = <>{header("More")}<section className="page-intro"><small>YOUR BUSINESS</small><h1>More seller tools</h1><p>Phase-one tools are ready now. Later areas stay clearly marked until real data services exist.</p></section><section className="seller-more-grid"><button onClick={() => go("payouts")}><strong>Payouts</strong><small>Verified finance records</small></button><button onClick={() => go("store")}><strong>Store Profile</strong><small>Public story and share link</small></button><button onClick={() => go("notifications")}><strong>Notifications</strong><small>Urgent store updates</small></button><button onClick={() => go("settings")}><strong>Settings</strong><small>Account and operations</small></button>{["Collections", "Customers", "Reviews & Questions", "Analytics"].map(label => <button className="planned" key={label}><strong>{label}</strong><small>Planned for the next release</small></button>)}</section></>;
  else content = <>
    {header("Your store")}<section className="store-cover"><img src={images[2]} alt="" /><span>MADE IN<br />NAMIBIA</span></section><section className="store-profile"><small>{state.store.type.toUpperCase()}</small><h1>{state.store.name}</h1><p>{state.store.city}, Namibia · {state.store.approved ? "Store open" : "Finish setup"}</p><div><strong>{live.length}<small>Published</small></strong><strong>{pieces}<small>Available units</small></strong><strong>{low.length}<small>Low stock</small></strong></div></section><section className="form-card"><h2>Your story</h2><textarea value={state.store.story} onChange={e => setState(current => ({ ...current, store: { ...current.store, story: e.target.value } }))} /><button className="primary" onClick={() => { save(state); setToast("Store story saved"); }}>Save changes</button></section><section className="share-card"><div><small>CUSTOMER LINK</small><h2>Share your store</h2><p>{storeShareUrl(state.store.name)}</p></div><button onClick={() => copy(storeShareUrl(state.store.name), "Store link copied")}><Icon name="share" /> Copy link</button></section>
  </>;

  const tabs: Array<[string, View, string]> = [["Home", "today", "home"], ["Orders", "orders", "orders"], ["Products", "collection", "collection"], ["Inventory", "inventory", "plus"], ["More", "more", "store"]];
  const desktop: Array<[string, View]> = [["Overview","today"],["Orders","orders"],["Products","collection"],["Inventory","inventory"],["Collections","more"],["Customers","more"],["Reviews & Questions","more"],["Analytics","more"],["Payouts","payouts"],["Store Profile","store"],["Notifications","notifications"],["Settings","settings"]];
  return <main className="seller-stage"><aside className="seller-desktop-nav"><div className="wordmark"><span>STYLISHME</span><small>SELLER</small></div><nav>{desktop.map(([label,target]) => <button key={label} className={view === target ? "active" : ""} onClick={() => go(target)}>{label}</button>)}</nav><button className="desktop-add" onClick={() => go("add")}>Add product</button></aside><div className="seller-app"><div className="seller-content">{content}</div><nav className="seller-bottom-nav">{tabs.map(([label, target, icon]) => <button key={target} className={view === target ? "active" : ""} aria-current={view === target ? "page" : undefined} onClick={() => go(target)}><Icon name={icon} /><span>{label}</span></button>)}</nav>{toast && <div className="seller-toast" role="status">{toast}</div>}</div></main>;
}
