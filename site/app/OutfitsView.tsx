"use client";

/* Curated outfit photography is intentionally rendered at its native crop. */
/* eslint-disable @next/next/no-img-element */

import type { Outfit } from "./outfit-catalog";

export type OutfitProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  available: boolean;
};

type Props = {
  outfits: Outfit[];
  selectedId: string;
  products: OutfitProduct[];
  savedOutfitIds: string[];
  replacements: Record<string, string>;
  onSelect: (id: string) => void;
  onSave: (id: string) => void;
  onAddAll: (id: string, productIds: string[]) => void;
  onTryOn: (productIds: string[]) => void;
  onReplace: (originalProductId: string, currentProductId: string) => void;
  onOpenProduct: (id: string) => void;
};

const money = (value: number) => `N$${value.toLocaleString("en-US")}`;

export default function OutfitsView({
  outfits,
  selectedId,
  products,
  savedOutfitIds,
  replacements,
  onSelect,
  onSave,
  onAddAll,
  onTryOn,
  onReplace,
  onOpenProduct,
}: Props) {
  const selected = outfits.find((outfit) => outfit.id === selectedId) ?? outfits[0];

  if (!selected) {
    return <section className="outfit-view"><p>No curated outfits are available yet.</p></section>;
  }

  const items = selected.productIds.flatMap((originalId) => {
    const currentId = replacements[originalId] ?? originalId;
    const product = products.find((item) => item.id === currentId);
    return product ? [{ ...product, originalId }] : [];
  });
  const total = items.reduce((sum, product) => sum + product.price, 0);
  const availableCount = items.filter((product) => product.available).length;
  const saved = savedOutfitIds.includes(selected.id);

  return (
    <section className="outfit-view" aria-labelledby="outfit-title">
      <div className="outfit-view-heading">
        <small>CURATED FOR NAMIBIA</small>
        <h1>Outfits</h1>
      </div>

      <div className="outfit-stage">
        <img src={selected.image} alt={selected.title} />
        <div>
          <small>{selected.location}</small>
          <h2 id="outfit-title">{selected.title}</h2>
          <span>Curated by {selected.curator}</span>
          <p>{selected.note}</p>
        </div>
      </div>

      <div className="outfit-selector" aria-label="Choose a curated outfit">
        {outfits.map((outfit) => (
          <button
            key={outfit.id}
            className={outfit.id === selected.id ? "active" : ""}
            aria-pressed={outfit.id === selected.id}
            onClick={() => onSelect(outfit.id)}
          >
            <img src={outfit.image} alt="" />
            <span>{outfit.title}</span>
          </button>
        ))}
      </div>

      <div className="outfit-total">
        <span>Combined total · {items.length} pieces</span>
        <strong>{money(total)}</strong>
      </div>

      <div className="outfit-items" aria-label={`Pieces in ${selected.title}`}>
        {items.map((product) => (
          <article className={`outfit-item-card ${product.available ? "" : "unavailable"}`} key={product.originalId}>
            <button
              className="outfit-item"
              onClick={() => onOpenProduct(product.id)}
              aria-label={`Open ${product.name}${product.available ? "" : ", unavailable"}`}
            >
              <span className="outfit-item-image">
                <img src={product.image} alt="" />
                {!product.available && <b>Unavailable</b>}
              </span>
              <strong>{product.name}</strong>
              <small>{money(product.price)}</small>
              <span className="outfit-item-link">View item</span>
            </button>
            <button className="outfit-replace" aria-label={`Replace ${product.name}`} onClick={() => onReplace(product.originalId, product.id)}>Replace</button>
          </article>
        ))}
      </div>

      <div className="outfit-actions">
        <button
          className={`outline-button ${saved ? "saved" : ""}`}
          aria-pressed={saved}
          onClick={() => onSave(selected.id)}
        >
          {saved ? "Saved Outfit" : "Save Outfit"}
        </button>
        <button className="outline-button try-look" disabled={!availableCount} onClick={() => onTryOn(items.filter((item) => item.available).map((item) => item.id))}>
          Try On This Look
        </button>
        <button className="gradient-button" disabled={!availableCount} onClick={() => onAddAll(selected.id, items.map((item) => item.id))}>
          {availableCount ? "Add All to Cart" : "All items unavailable"}
        </button>
      </div>
    </section>
  );
}
