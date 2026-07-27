"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useMemo, useState } from "react";

import type { EligibleStoryItem, PublicCustomerStory } from "./customer-story-domain";
import type { Product } from "./product-catalog";

export default function CustomerStoryComposer({
  eligibleItems, products, displayName, town, onPublished, onClose,
}: {
  eligibleItems: EligibleStoryItem[]; products: Product[]; displayName: string; town: string;
  onPublished: (story?: PublicCustomerStory) => void; onClose: () => void;
}) {
  const eligibleProducts = useMemo(() => eligibleItems.flatMap(item => {
    const product = products.find(candidate => candidate.id === item.productId);
    return product ? [product] : [];
  }), [eligibleItems, products]);
  const [selected, setSelected] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState(town);
  const [showName, setShowName] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected.length || !image) return setError("Choose purchased pieces and one portrait outfit photo");
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.append("image", image);
      selected.forEach(id => form.append("productId", id));
      form.append("caption", caption);
      form.append("town", location);
      form.append("displayName", showName ? displayName : "");
      form.append("idempotencyKey", crypto.randomUUID());
      const response = await fetch("/api/customer-stories", { method: "POST", body: form });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to publish your outfit");
      onPublished();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to publish your outfit"); }
    finally { setBusy(false); }
  };

  return <section className="customer-story-overlay" role="dialog" aria-modal="true" aria-label="Share an outfit">
    <form className="customer-story-composer" onSubmit={submit}>
      <header><div><small>WORN BY YOU</small><h1>Share your StylishMe look</h1></div><button type="button" onClick={onClose} aria-label="Close outfit upload">×</button></header>
      <section><h2>Choose purchased pieces</h2><p>Only delivered or collected StylishMe purchases can be tagged.</p><div className="customer-story-products">{eligibleProducts.map(product => <label key={product.id}><input type="checkbox" checked={selected.includes(product.id)} onChange={() => setSelected(current => current.includes(product.id) ? current.filter(id => id !== product.id) : [...current, product.id])} /><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.designer}</small></span></label>)}</div></section>
      <section><h2>Add one portrait outfit photo</h2><label className="customer-story-upload">{image ? image.name : "Choose a JPG, PNG or WebP photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImage(event.target.files?.[0] ?? null)} /></label><small>Minimum 720 × 960. Photos are checked before publishing and location metadata is removed.</small></section>
      <section><h2>Preview & publish</h2><label>Short caption <textarea value={caption} maxLength={180} onChange={event => setCaption(event.target.value)} placeholder="How you made the look yours" /></label><label>Town <input value={location} maxLength={60} onChange={event => setLocation(event.target.value)} /></label><label className="customer-story-name"><input type="checkbox" checked={showName} onChange={event => setShowName(event.target.checked)} /> Show my first name</label></section>
      {error && <p className="customer-story-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Not now</button><button type="submit" disabled={busy}>{busy ? "Checking your photo…" : "Publish outfit"}</button></footer>
    </form>
  </section>;
}
