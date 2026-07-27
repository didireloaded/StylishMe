"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";

import { buildProduct, type Product } from "./product-catalog";
import { matchesStoreSlug } from "./unified-domain";

type LiveSellerProduct = {
  id: string; name: string; description: string; price: number; salePrice?: number;
  images: string[]; collection?: string; category?: string;
  store?: { name?: string; city?: string; story?: string; type?: string };
};

const seededProducts = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const money = (value: number) => `N$${value.toLocaleString("en-US")}`;
const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const isLiveSellerProduct = (product: LiveSellerProduct | Product | undefined): product is LiveSellerProduct =>
  Boolean(product && "store" in product);

export default function StorefrontView({ storeSlug, onExit }: { storeSlug: string; onExit: () => void }) {
  const [remote, setRemote] = useState<LiveSellerProduct[]>([]);
  const [linkedProduct] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("product") ?? "");
  const seeded = useMemo(
    () => seededProducts.filter((product) => matchesStoreSlug(product.designer, storeSlug)),
    [storeSlug],
  );
  const [selected, setSelected] = useState<LiveSellerProduct | Product | null>(
    () => seeded.find((product) => slug(product.name) === linkedProduct || product.id === linkedProduct) ?? null,
  );

  useEffect(() => {
    fetch(`/api/catalog?store=${encodeURIComponent(storeSlug)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const products = Array.isArray(data.products) ? data.products as LiveSellerProduct[] : [];
        setRemote(products);
        const match = products.find((product) => slug(product.name) === linkedProduct || product.id === linkedProduct);
        if (match) setSelected(match);
      })
      .catch(() => setRemote([]));
  }, [linkedProduct, storeSlug]);

  const pieces: Array<LiveSellerProduct | Product> = remote.length ? remote : seeded;
  const first = pieces[0];
  const storeName = isLiveSellerProduct(first) ? first.store?.name : first?.designer;
  const city = isLiveSellerProduct(first) ? first.store?.city : first?.location;
  const story = isLiveSellerProduct(first) ? first.store?.story : "A considered collection created for modern Namibian life.";

  return <main className="storefront-stage">
    <div className="storefront-shell">
      <header><button onClick={onExit}>← Explore StylishMe</button><strong>STYLISHME</strong><span>♡</span></header>
      <section className="storefront-hero">
        {first && <img src={"images" in first ? first.images[0] : first.image} alt="" />}
        <div><small>VISITING A STYLISHME STORE</small><h1>{storeName || "StylishMe Store"}</h1><p>{city ? `${city}, Namibia` : "Namibia"} · Verified seller</p></div>
      </section>
      <section className="storefront-story"><small>THE STORE</small><h2>Only pieces from {storeName || "this seller"}.</h2><p>{story || "A local collection available through StylishMe."}</p></section>
      <section className="storefront-grid" aria-label={`Products from ${storeName || "this store"}`}>
        {pieces.map((product) => <article key={product.id}>
          <button className="storefront-image" onClick={() => setSelected(product)}>
            <img src={"images" in product ? product.images[0] : product.image} alt={product.name} />
          </button>
          <small>{"collection" in product ? product.collection || product.category : product.category}</small>
          <button onClick={() => setSelected(product)}><strong>{product.name}</strong></button>
          <span>{money(product.price)}</span>
        </article>)}
      </section>
      {!pieces.length && <section className="storefront-empty"><h2>This store is preparing its first collection.</h2><p>Come back soon or continue exploring StylishMe.</p></section>}
      <button className="storefront-exit" onClick={onExit}>Explore StylishMe</button>
      {selected && <div className="storefront-sheet" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
        <section onClick={(event) => event.stopPropagation()}>
          <button aria-label="Close product" onClick={() => setSelected(null)}>×</button>
          <img src={"images" in selected ? selected.images[0] : selected.image} alt={selected.name} />
          <small>{storeName}</small><h2>{selected.name}</h2><strong>{money(selected.price)}</strong>
          <p>{"description" in selected ? selected.description : "A considered wardrobe piece from this StylishMe store."}</p>
          <button className="storefront-shop-button" onClick={onExit}>Continue in StylishMe to choose options</button>
        </section>
      </div>}
    </div>
  </main>;
}
