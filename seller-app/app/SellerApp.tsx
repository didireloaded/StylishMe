"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { productReadiness, productShareUrl, storeShareUrl, totalStock } from "./seller-domain";

type View = "today" | "collection" | "add" | "orders" | "store";
type Status = "Live" | "Pending review" | "Changes requested" | "Draft";
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

const images = [
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=84",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=84",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=84",
];
const products: SellerProduct[] = [
  { id: "sp1", name: "Ondelela Evening Dress", description: "A fluid ceremony dress cut and finished in Windhoek.", category: "Women", collection: "Modern Ceremony", price: 2450, material: "Viscose satin", fit: "Regular", colours: ["Coral", "Black"], variants: [{ size: "S", colour: "Coral", quantity: 2 }, { size: "M", colour: "Coral", quantity: 4 }, { size: "L", colour: "Black", quantity: 1 }], images: [images[0]], delivery: ["Nationwide delivery", "Store collection"], returns: "14 days", madeToOrder: true, status: "Live" },
  { id: "sp2", name: "Walvis Linen Co-ord", description: "Breathable tailoring for the coast.", category: "Women", collection: "Coastline Weekend", price: 1399, salePrice: 1199, material: "Linen blend", fit: "Relaxed", colours: ["Sand"], variants: [{ size: "S", colour: "Sand", quantity: 1 }, { size: "M", colour: "Sand", quantity: 2 }], images: [images[1]], delivery: ["Nationwide delivery"], returns: "14 days", madeToOrder: false, status: "Pending review" },
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

export default function SellerApp() {
  const [view, setView] = useState<View>("today");
  const [state, setState] = useState<SellerState>(initialState);
  const [draft, setDraft] = useState<SellerProduct>(blank);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [newStore, setNewStore] = useState({ name: "", type: "Designer", owner: "", city: "Windhoek", email: "", phone: "" });
  const [invite] = useState(() => typeof window === "undefined" ? "preview" : new URLSearchParams(window.location.search).get("invite") ?? localStorage.getItem("stylishme-seller-invite") ?? "preview");

  useEffect(() => {
    localStorage.setItem("stylishme-seller-invite", invite);
    fetch("/api/seller-state", { headers: { "x-seller-invite": invite } }).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      if (data.state) setState(data.state);
      else if (invite !== "preview") setNeedsSetup(true);
    }).catch(() => undefined);
  }, [invite]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => clearTimeout(timer); }, [toast]);
  const save = (next: SellerState) => {
    setState(next);
    void fetch("/api/seller-state", { method: "POST", headers: { "content-type": "application/json", "x-seller-invite": invite }, body: JSON.stringify({ state: next }) }).catch(() => undefined);
  };
  const finishSetup = (event: FormEvent) => {
    event.preventDefault();
    if (!newStore.name.trim() || !newStore.owner.trim() || !newStore.email.trim()) return setToast("Add your name, store and email");
    const next: SellerState = { store: { ...newStore, story: "", approved: false }, products: [] };
    save(next);
    setNeedsSetup(false);
    setToast("Your store is ready to complete");
  };

  if (needsSetup) return <main className="seller-stage"><div className="seller-app onboarding-app"><header className="seller-header"><div className="wordmark"><span>STYLISHME</span><small>SELLER</small></div></header><section className="onboarding-copy"><small>YOUR INVITATION</small><h1>Welcome to StylishMe Seller</h1><p>Create the store customers will discover inside StylishMe.</p></section><form className="form-card onboarding-form" onSubmit={finishSetup}><h2>Set up your store</h2><label>Your name<input value={newStore.owner} onChange={e => setNewStore({ ...newStore, owner: e.target.value })} /></label><label>Store or brand name<input value={newStore.name} onChange={e => setNewStore({ ...newStore, name: e.target.value })} /></label><div className="form-pair"><label>What do you sell?<select value={newStore.type} onChange={e => setNewStore({ ...newStore, type: e.target.value })}><option>Designer</option><option>Brand or boutique</option><option>Merch</option></select></label><label>Location<input value={newStore.city} onChange={e => setNewStore({ ...newStore, city: e.target.value })} /></label></div><div className="form-pair"><label>Email<input type="email" value={newStore.email} onChange={e => setNewStore({ ...newStore, email: e.target.value })} /></label><label>Phone number<input value={newStore.phone} onChange={e => setNewStore({ ...newStore, phone: e.target.value })} /></label></div><button className="primary" type="submit">Continue to your store</button></form>{toast && <div className="seller-toast" role="status">{toast}</div>}</div></main>;

  const live = state.products.filter(p => p.status === "Live");
  const low = state.products.filter(p => totalStock(p.variants) < 3);
  const pieces = state.products.reduce((sum, p) => sum + totalStock(p.variants), 0);
  const ready = productReadiness(draft);
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const copy = async (value: string, message: string) => { try { await navigator.clipboard.writeText(value); } catch {} setToast(message); };
  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    setToast("Adding your photos…");
    try {
      const uploaded = await Promise.all(files.slice(0, 5).map(async (file) => {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/seller-images", { method: "POST", headers: { "x-seller-invite": invite }, body: form });
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
    const next = { ...draft, id: draft.id || `seller-${Date.now()}`, status: "Pending review" as const };
    save({ ...state, products: draft.id ? state.products.map(p => p.id === draft.id ? next : p) : [next, ...state.products] });
    setDraft(blank()); setStep(0); go("collection"); setToast("Sent to StylishMe for review");
  };
  const header = (title?: string) => <header className="seller-header"><button className="wordmark" onClick={() => go("today")}><span>STYLISHME</span><small>SELLER</small></button>{title && <strong>{title}</strong>}<button className="avatar" onClick={() => go("store")} aria-label="Open store profile">OS</button></header>;

  let content;
  if (view === "today") content = <>
    {header()}
    <section className="welcome"><div><small>GOOD MORNING</small><h1>Good morning, {state.store.owner}.</h1><p>Your collection is looking considered. Here is what needs your attention today.</p></div><span>{state.store.approved ? "Approved store" : "Under review"}</span></section>
    <section className="editorial-hero"><img src={(live[0] ?? state.products[0]).images[0]} alt="" /><div><small>YOUR SHOP TODAY</small><h2>{pieces} pieces ready to be discovered.</h2><p>{live.length} live products · {low.length} need stock attention</p><button onClick={() => go("add")}>Add a new piece</button></div></section>
    <section><div className="section-title"><div><small>AT A GLANCE</small><h2>Your collection</h2></div><button onClick={() => go("collection")}>View all</button></div><div className="status-stories">{[["Live", live.length], ["In review", state.products.filter(p => p.status === "Pending review").length], ["Low stock", low.length], ["Orders", 3]].map(([label, value]) => <button key={label} onClick={() => go(label === "Orders" ? "orders" : "collection")}><span>{value}</span><small>{label}</small></button>)}</div></section>
    <section><div className="section-title"><div><small>NEEDS YOU</small><h2>Small actions, beautifully handled.</h2></div></div><div className="attention-list"><button onClick={() => go("collection")}><i className="coral" /><div><strong>Lilac Ceremony Set</strong><small>Add stock before it can return to the shop.</small></div><b>→</b></button><button onClick={() => go("orders")}><i className="lilac" /><div><strong>Order SM-2058</strong><small>Confirm collection is ready by 15:00.</small></div><b>→</b></button></div></section>
    <section className="share-card"><div><small>YOUR STOREFRONT</small><h2>Share your store</h2><p>Send customers directly to your StylishMe collection.</p></div><button onClick={() => copy(storeShareUrl(state.store.name), "Store link copied")}><Icon name="share" /> Copy link</button></section>
  </>;
  else if (view === "collection") content = <>
    {header("Your collection")}<section className="page-intro"><small>YOUR PIECES</small><h1>Your collection</h1><p>Everything customers can discover, plus pieces waiting for review.</p><button className="primary" onClick={() => go("add")}>Add a new piece</button></section>
    <div className="filter-chips">{["All", "Live", "In review", "Needs attention"].map(label => <button key={label}>{label}</button>)}</div>
    <section className="seller-product-grid">{state.products.map(product => <article key={product.id} className="seller-product-card"><div className="product-photo"><img src={product.images[0] || images[0]} alt={product.name} /><span className={`status ${product.status.toLowerCase().replaceAll(" ", "-")}`}>{product.status}</span></div><div className="product-copy"><small>{product.collection || product.category}</small><h2>{product.name}</h2><strong>N${product.price.toLocaleString()}</strong><p>{totalStock(product.variants)} in stock</p></div><div className="product-actions"><button onClick={() => copy(productShareUrl(state.store.name, product.name), "Product link copied")}><Icon name="share" /> Share</button><button onClick={() => { setDraft(product); setStep(0); go("add"); }}>Edit</button></div></article>)}</section>
  </>;
  else if (view === "add") content = <>
    {header(draft.id ? "Edit piece" : "Add a new piece")}<section className="page-intro compact"><small>BUILD THE PRODUCT PAGE</small><h1>{draft.id ? "Refine this piece" : "Add a new piece"}</h1><p>Give customers everything they need to choose confidently.</p></section>
    <div className="form-progress">{["The piece", "Options & stock", "Delivery", "Review"].map((label, index) => <button key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => setStep(index)}><span>{index + 1}</span><small>{label}</small></button>)}</div>
    <form className="piece-form" onSubmit={submit}>
      {step === 0 && <section className="form-card"><h2>Tell the story of this piece</h2><label>Product photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => void uploadImages([...(e.target.files ?? [])])} /></label>{draft.images.length > 0 && <div className="photo-preview">{draft.images.slice(0, 3).map(image => <img key={image} src={image} alt="" />)}</div>}<label>Product name<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Ondelela Evening Dress" /></label><label>Description<textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Describe the shape, feeling and details." /></label><div className="form-pair"><label>Category<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{["Women", "Men", "Kids", "Shoes", "Accessories", "Traditional wear", "Merch"].map(v => <option key={v}>{v}</option>)}</select></label><label>Collection<input value={draft.collection} onChange={e => setDraft({ ...draft, collection: e.target.value })} placeholder="Collection name" /></label></div><div className="form-pair"><label>Price (N$)<input type="number" value={draft.price || ""} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} /></label><label>Sale price<input type="number" value={draft.salePrice || ""} onChange={e => setDraft({ ...draft, salePrice: Number(e.target.value) || undefined })} /></label></div></section>}
      {step === 1 && <section className="form-card"><h2>Sizes, colours and stock</h2><div className="form-pair"><label>Material<input value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} /></label><label>Fit<select value={draft.fit} onChange={e => setDraft({ ...draft, fit: e.target.value })}>{["Regular", "Relaxed", "Tailored", "Oversized", "Close fit"].map(v => <option key={v}>{v}</option>)}</select></label></div><label>Colours<input value={draft.colours.join(", ")} onChange={e => setDraft({ ...draft, colours: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} /></label><div className="variant-head"><h3>Stock by size</h3><button type="button" onClick={() => setDraft(current => ({ ...current, variants: [...current.variants, { size: "M", colour: current.colours[0] || "Default", quantity: 1 }] }))}>+ Add size</button></div>{draft.variants.map((variant, index) => <div className="variant-row" key={index}><input value={variant.size} aria-label={`Size ${index + 1}`} onChange={e => setDraft(current => ({ ...current, variants: current.variants.map((v, i) => i === index ? { ...v, size: e.target.value } : v) }))} /><select value={variant.colour} onChange={e => setDraft(current => ({ ...current, variants: current.variants.map((v, i) => i === index ? { ...v, colour: e.target.value } : v) }))}>{draft.colours.map(colour => <option key={colour}>{colour}</option>)}</select><input type="number" min="0" value={variant.quantity} aria-label={`Quantity ${index + 1}`} onChange={e => setDraft(current => ({ ...current, variants: current.variants.map((v, i) => i === index ? { ...v, quantity: Number(e.target.value) } : v) }))} /></div>)}<div className="stock-total"><span>Total available</span><strong>{totalStock(draft.variants)}</strong></div></section>}
      {step === 2 && <section className="form-card"><h2>Delivery and returns</h2>{["Nationwide delivery", "Windhoek delivery", "Store collection"].map(option => <label className="check-row" key={option}><input type="checkbox" checked={draft.delivery.includes(option)} onChange={() => setDraft(current => ({ ...current, delivery: current.delivery.includes(option) ? current.delivery.filter(v => v !== option) : [...current.delivery, option] }))} /><span>{option}</span></label>)}<label className="check-row"><input type="checkbox" checked={draft.madeToOrder} onChange={e => setDraft({ ...draft, madeToOrder: e.target.checked })} /><span>This piece can be made to order</span></label><label>Return information<textarea value={draft.returns} onChange={e => setDraft({ ...draft, returns: e.target.value })} /></label></section>}
      {step === 3 && <section className="form-card review-card"><small>READY FOR STYLISHME</small><h2>{draft.name || "Untitled piece"}</h2>{draft.images[0] && <img src={draft.images[0]} alt="" />}<dl><div><dt>Price</dt><dd>N${draft.price.toLocaleString()}</dd></div><div><dt>Stock</dt><dd>{totalStock(draft.variants)} pieces</dd></div><div><dt>Delivery</dt><dd>{draft.delivery.join(", ")}</dd></div></dl>{!ready.ready && <p className="missing">Still needed: {ready.missing.join(", ")}.</p>}<p>StylishMe will review the details before this piece becomes visible to customers.</p></section>}
      <div className="form-actions">{step > 0 && <button type="button" onClick={() => setStep(v => v - 1)}>Back</button>}{step < 3 ? <button type="button" className="primary" onClick={() => setStep(v => v + 1)}>Continue</button> : <button type="submit" className="primary" disabled={!ready.ready}>Submit for review</button>}</div>
    </form>
  </>;
  else if (view === "orders") content = <>
    {header("Orders")}<section className="page-intro"><small>FROM CUSTOMERS</small><h1>Orders</h1><p>Prepare every piece with care and keep customers informed.</p></section><div className="filter-chips">{["To prepare", "Ready", "Completed"].map(label => <button key={label}>{label}</button>)}</div><section className="order-list">{[["SM-2058", "Ondelela Evening Dress", "Store collection", "Ready by 15:00", images[0]], ["SM-2053", "Walvis Linen Co-ord", "Standard delivery", "Pack by tomorrow", images[1]], ["SM-2049", "Ondelela Evening Dress", "Express delivery", "Courier collection today", images[0]]].map(([id, name, delivery, timing, image]) => <article key={id}><img src={image} alt="" /><div><small>{id}</small><h2>{name}</h2><p>{delivery} · {timing}</p></div><button onClick={() => setToast(delivery === "Store collection" ? "Marked ready for collection" : "Marked ready for delivery")}>Mark ready</button></article>)}</section>
  </>;
  else content = <>
    {header("Your store")}<section className="store-cover"><img src={images[2]} alt="" /><span>MADE IN<br />NAMIBIA</span></section><section className="store-profile"><small>{state.store.type.toUpperCase()}</small><h1>{state.store.name}</h1><p>{state.store.city}, Namibia · {state.store.approved ? "Approved seller" : "Approval pending"}</p><div><strong>{live.length}<small>Live pieces</small></strong><strong>4.9<small>Customer rating</small></strong><strong>2–4 days<small>Delivery</small></strong></div></section><section className="form-card"><h2>Your story</h2><textarea value={state.store.story} onChange={e => setState(current => ({ ...current, store: { ...current.store, story: e.target.value } }))} /><button className="primary" onClick={() => { save(state); setToast("Store story saved"); }}>Save changes</button></section><section className="share-card"><div><small>CUSTOMER LINK</small><h2>Share your store</h2><p>{storeShareUrl(state.store.name)}</p></div><button onClick={() => copy(storeShareUrl(state.store.name), "Store link copied")}><Icon name="share" /> Copy link</button></section>
  </>;

  const tabs: Array<[string, View, string]> = [["Today", "today", "home"], ["Collection", "collection", "collection"], ["Add", "add", "plus"], ["Orders", "orders", "orders"], ["Store", "store", "store"]];
  return <main className="seller-stage"><div className="seller-app"><div className="seller-content">{content}</div><nav className="seller-bottom-nav">{tabs.map(([label, target, icon]) => <button key={target} className={view === target ? "active" : ""} aria-current={view === target ? "page" : undefined} onClick={() => go(target)}><Icon name={icon} /><span>{label}</span></button>)}</nav>{toast && <div className="seller-toast" role="status">{toast}</div>}</div></main>;
}
