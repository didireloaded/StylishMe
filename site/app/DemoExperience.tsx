"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import SellerApp from "./SellerApp";
import StylishMeApp from "./StylishMeApp";

type DemoRole = "customer" | "seller";
type DemoStage = "choose" | "tour" | "explore";

const tours = {
  customer: [
    {
      eyebrow: "DISCOVER",
      title: "Start with inspiration, not a crowded catalogue.",
      copy: "Browse outfit stories, new arrivals, local designers and carefully chosen edits from Namibia.",
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=84",
    },
    {
      eyebrow: "STYLE ME",
      title: "Turn an occasion into a complete look.",
      copy: "Choose where you are going, your budget and preferences. StylishMe brings together pieces you can actually shop.",
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=84",
    },
    {
      eyebrow: "SHOP CONFIDENTLY",
      title: "Find the right piece, fit and fulfilment.",
      copy: "Compare sizes, colours and stock, then choose delivery or store collection before placing an order.",
      image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=84",
    },
    {
      eyebrow: "YOUR STYLISHME",
      title: "Keep outfits, favourites and orders together.",
      copy: "Your wardrobe remembers saved looks and purchases, while delivery orders show progress clearly.",
      image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=84",
    },
  ],
  seller: [
    {
      eyebrow: "YOUR STOREFRONT",
      title: "Bring your brand story into StylishMe.",
      copy: "Create a dedicated store for your label, boutique or merch and share it directly with customers.",
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=84",
    },
    {
      eyebrow: "YOUR COLLECTION",
      title: "Add pieces with every detail customers need.",
      copy: "Publish photography, descriptions, sizes, colours, stock, prices and delivery choices from one guided flow.",
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=84",
    },
    {
      eyebrow: "DIRECT LINKS",
      title: "Share only your store or a single product.",
      copy: "A customer opening your link lands inside your collection, with a clear route back to the wider marketplace.",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=84",
    },
    {
      eyebrow: "THE DAY AT A GLANCE",
      title: "See what is selling and what needs attention.",
      copy: "Follow orders, collection readiness, delivery fulfilment and stock without the experience feeling technical.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=84",
    },
  ],
} satisfies Record<DemoRole, Array<{ eyebrow: string; title: string; copy: string; image: string }>>;

const joinUrl = (role: DemoRole) =>
  `/login?returnTo=${encodeURIComponent(`/?join=${role}`)}`;

export default function DemoExperience() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [stage, setStage] = useState<DemoStage>("choose");
  const [slide, setSlide] = useState(0);

  const choose = (next: DemoRole) => {
    setRole(next);
    setSlide(0);
    setStage("tour");
    window.scrollTo({ top: 0 });
  };

  if (stage === "explore" && role) {
    return (
      <div className="demo-explore-shell">
        <aside className="demo-explore-bar" aria-label={`${role} demo controls`}>
          <div><small>{role.toUpperCase()} DEMO</small><span>Explore safely — changes stay inside this preview.</span></div>
          <button onClick={() => setStage("choose")}>Switch view</button>
          <a href={joinUrl(role)}>Sign up as {role === "seller" ? "a vendor" : "a customer"}</a>
        </aside>
        {role === "seller" ? <SellerApp demoMode /> : <StylishMeApp user={null} demoMode />}
      </div>
    );
  }

  if (stage === "choose" || !role) {
    return (
      <main className="demo-stage">
        <section className="demo-shell demo-choice">
          <header><button onClick={() => window.location.assign("/")}>STYLISHME</button><span>INTERACTIVE PREVIEW</span></header>
          <div className="demo-intro">
            <small>SEE IT FROM BOTH SIDES</small>
            <h1>Meet StylishMe before you join.</h1>
            <p>Choose the experience that matters to you. You can take a short guided tour, explore the working preview and switch sides at any time.</p>
          </div>
          <div className="demo-role-grid">
            <button onClick={() => choose("customer")}>
              <img src={tours.customer[0].image} alt="" />
              <span>01</span><small>I’M HERE TO SHOP</small>
              <strong>Explore as a customer</strong>
              <p>Discover looks, stores and designers, then try the shopping journey.</p>
              <b>Start customer tour →</b>
            </button>
            <button onClick={() => choose("seller")}>
              <img src={tours.seller[0].image} alt="" />
              <span>02</span><small>I SELL FASHION</small>
              <strong>Explore as a seller</strong>
              <p>See how a store, collection, orders and shareable links come together.</p>
              <b>Start seller tour →</b>
            </button>
          </div>
          <p className="demo-note">No account is needed for the preview. Nothing you change here is published.</p>
        </section>
      </main>
    );
  }

  const item = tours[role][slide];
  const last = slide === tours[role].length - 1;
  return (
    <main className="demo-stage">
      <section className="demo-shell demo-tour">
        <header><button onClick={() => setStage("choose")}>← Choose another view</button><span>{role.toUpperCase()} TOUR</span></header>
        <article>
          <div className="demo-tour-photo"><img src={item.image} alt="" /><span>{String(slide + 1).padStart(2, "0")}</span></div>
          <div className="demo-tour-copy">
            <small>{item.eyebrow}</small>
            <h1>{item.title}</h1>
            <p>{item.copy}</p>
            <div className="demo-progress" aria-label={`Step ${slide + 1} of ${tours[role].length}`}>
              {tours[role].map((step, index) => <i key={step.eyebrow} className={index <= slide ? "active" : ""} />)}
            </div>
            <div className="demo-actions">
              {slide > 0 && <button onClick={() => setSlide(value => value - 1)}>Back</button>}
              {!last && <button className="primary" onClick={() => setSlide(value => value + 1)}>Next</button>}
              {last && <button className="primary" onClick={() => setStage("explore")}>Explore the working demo</button>}
            </div>
            {!last ? <button className="demo-skip" onClick={() => setStage("explore")}>Skip to the demo</button> : <a className="demo-join" href={joinUrl(role)}>Ready? Sign up as {role === "seller" ? "a vendor" : "a customer"}</a>}
          </div>
        </article>
      </section>
    </main>
  );
}
