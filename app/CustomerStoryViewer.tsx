"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

import type { PublicCustomerStory } from "./customer-story-domain";

export default function CustomerStoryViewer({ story, signedIn, onChange, onProduct, onClose }: {
  story: PublicCustomerStory; signedIn: boolean; onChange: () => void; onProduct: (id: string) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { closeRef.current?.focus(); void fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "customer_story_viewed", targetType: "story", targetId: story.id }) }); }, [story.id]);
  const like = async () => {
    if (!signedIn) return setMessage("Sign in to like this outfit");
    setBusy(true);
    const response = await fetch(`/api/customer-stories/${story.id}/like`, { method: "POST" });
    setBusy(false);
    if (response.ok) onChange(); else setMessage("Unable to update that like right now");
  };
  const share = async () => {
    const url = `${window.location.origin}/?story=${story.id}`;
    try { if (navigator.share) await navigator.share({ title: "Worn by StylishMe", text: story.caption || "See this verified StylishMe outfit", url }); else await navigator.clipboard.writeText(url); setMessage("Story link ready to share"); } catch {}
    void fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "customer_story_shared", targetType: "story", targetId: story.id }) });
  };
  const report = async (reason: string) => {
    const response = await fetch(`/api/customer-stories/${story.id}/report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    setReporting(false); setMessage(response.ok ? "Thank you. The report was received." : "Unable to send that report");
  };
  const remove = async () => { if (!confirm("Remove this outfit from StylishMe?")) return; const response = await fetch(`/api/customer-stories/${story.id}`, { method: "DELETE" }); if (response.ok) { onChange(); onClose(); } };

  return <section className="customer-story-viewer" role="dialog" aria-modal="true" aria-label="Verified customer outfit" style={{ backgroundImage: `url(${story.imageUrl})` }} onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <button ref={closeRef} className="customer-story-close" onClick={onClose} aria-label="Close customer story">×</button>
    <div className="customer-story-badge">✓ Verified purchase</div>
    <div className="customer-story-panel"><small>{story.displayName || "StylishMe customer"}{story.town ? ` · ${story.town}` : ""}</small>{story.caption && <h1>{story.caption}</h1>}<p>Tagged store: <strong>{[...new Set(story.products.map(product => product.seller))].join(", ")}</strong></p><div className="customer-story-tray">{story.products.map(product => <button key={product.id} onClick={() => onProduct(product.id)}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>N${product.price.toLocaleString()}</small></span></button>)}</div><div className="customer-story-actions"><button disabled={busy} aria-pressed={story.liked} onClick={like}>{story.liked ? "♥ Liked" : "♡ Like"} · {story.likeCount}</button><button onClick={share}>Share</button><button onClick={() => story.products[0] && onProduct(story.products[0].id)}>Shop the pieces</button></div><div className="customer-story-safety">{story.isOwner ? <button onClick={remove}>Delete my story</button> : <button onClick={() => setReporting(value => !value)}>Report</button>}{reporting && <div>{["inappropriate", "misleading", "privacy", "spam", "other"].map(reason => <button key={reason} onClick={() => void report(reason)}>{reason}</button>)}</div>}</div>{message && <p role="status">{message}</p>}</div>
  </section>;
}
