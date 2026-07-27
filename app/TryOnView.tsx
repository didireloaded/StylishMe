"use client";

/* Uploaded and catalogue images intentionally use their natural fashion crop. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from "react";

import type { Product } from "./product-catalog";
import { createCatalogueLook } from "./style-me-domain";
import {
  parseTryOnResponse,
  progressMessage,
  TRY_ON_CONSENT_VERSION,
  TRY_ON_DISCLAIMER,
  type TryOnConsent,
  type TryOnImageResult,
  type TryOnJobStatus,
  type TryOnSettings,
  validateTryOnConsent,
  validateTryOnFile,
} from "./try-on-domain";

type TryOnStep = "style-brief" | "style-result" | "intro" | "sign-in" | "consent" | "photo" | "source" | "settings" | "review" | "generating" | "result";
type StylingBrief = {
  occasion: string;
  location: string;
  timing: string;
  budget: string;
  colours: string[];
  style: string;
  ownedItems: string;
};

type Props = {
  products: Product[];
  initialProductIds: string[];
  onOpenProduct: (productId: string) => void;
  onAddProduct: (productId: string) => void;
  onAddLook: (productIds: string[]) => void;
  onContinueShopping: () => void;
  initialIntent?: "style" | "try-on";
  isSignedIn?: boolean;
  signInUrl?: string;
};

const emptyConsent: TryOnConsent = {
  ownsImage: false,
  understandsAi: false,
  acceptsPrivacy: false,
  confirmsAdult: false,
};

const defaultSettings: TryOnSettings = {
  transfer: "outfit-only",
  background: "preserve",
  styling: "natural",
};
const defaultBrief: StylingBrief = {
  occasion: "Dinner",
  location: "Windhoek",
  timing: "This weekend",
  budget: "N$1,500",
  colours: ["Warm neutrals"],
  style: "Modern",
  ownedItems: "",
};

const money = (value: number) => `N$${value.toLocaleString("en-US")}`;

const consentRows: Array<[keyof TryOnConsent, string]> = [
  ["ownsImage", "I confirm this is my image or I have permission to use it."],
  ["understandsAi", "I understand this preview is digitally created and may differ from real clothing."],
  ["acceptsPrivacy", "I accept the privacy and image-processing terms."],
  ["confirmsAdult", "I confirm I am 18 or older."],
];

export default function TryOnView({
  products,
  initialProductIds,
  onOpenProduct,
  onAddProduct,
  onAddLook,
  onContinueShopping,
  initialIntent = "try-on",
  isSignedIn = true,
  signInUrl = "/login?returnTo=/",
}: Props) {
  const validInitialIds = useMemo(() => {
    const ids = initialProductIds.filter((id) => products.some((product) => product.id === id));
    return ids.length ? ids : products[0] ? [products[0].id] : [];
  }, [initialProductIds, products]);
  const [step, setStep] = useState<TryOnStep>(initialIntent === "style" ? "style-brief" : "intro");
  const [consent, setConsent] = useState<TryOnConsent>(emptyConsent);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [referencePhoto, setReferencePhoto] = useState<File | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(validInitialIds);
  const [settings, setSettings] = useState<TryOnSettings>(defaultSettings);
  const [status, setStatus] = useState<TryOnJobStatus>("queued");
  const [result, setResult] = useState<TryOnImageResult | null>(null);
  const [error, setError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [brief, setBrief] = useState<StylingBrief>(defaultBrief);
  const requestController = useRef<AbortController | null>(null);

  const selectedProducts = selectedProductIds.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    return product ? [product] : [];
  });
  const outfitTotal = selectedProducts.reduce((total, product) => total + product.price, 0);
  const consentReady = validateTryOnConsent(consent).ok;

  const reset = () => {
    setStep(initialIntent === "style" ? "style-brief" : "intro");
    setConsent(emptyConsent);
    setPhoto(null);
    setPhotoPreview("");
    setReferencePhoto(null);
    setSelectedProductIds(validInitialIds);
    setSettings(defaultSettings);
    setStatus("queued");
    setResult(null);
    setError("");
    setPhotoMessage("");
  };

  const toggleBriefColour = (colour: string) => {
    setBrief((current) => ({
      ...current,
      colours: current.colours.includes(colour)
        ? current.colours.filter((item) => item !== colour)
        : [...current.colours, colour],
    }));
  };

  const buildStyledLook = () => {
    const picked = createCatalogueLook(products, brief);
    setSelectedProductIds(picked.map((product) => product.id));
    setError(picked.length ? "" : "No available pieces match this budget yet. Try a flexible budget or another occasion.");
    setStep("style-result");
  };

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    const validation = validateTryOnFile(file);
    setPhotoMessage(validation.message);
    if (!validation.ok) {
      setPhoto(null);
      setPhotoPreview("");
      return;
    }
    setPhoto(file);
    const reader = new window.FileReader();
    reader.addEventListener("load", () => setPhotoPreview(typeof reader.result === "string" ? reader.result : ""));
    reader.readAsDataURL(file);
  };

  const handleReference = (file: File | null) => {
    if (!file) return;
    const validation = validateTryOnFile(file);
    setError(validation.ok ? "" : validation.message);
    setReferencePhoto(validation.ok ? file : null);
    if (validation.ok) setSelectedProductIds([]);
  };

  const toggleProduct = (productId: string) => {
    setReferencePhoto(null);
    setSelectedProductIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (current.length >= 4) {
        setError("Choose up to four pieces for one clear preview.");
        return current;
      }
      setError("");
      return [...current, productId];
    });
  };

  const generatePreview = async () => {
    if (!isSignedIn) {
      setStep("sign-in");
      return;
    }
    if (!photo || (!selectedProducts.length && !referencePhoto)) return;
    setError("");
    setStatus("validating");
    setStep("generating");

    try {
      const form = new window.FormData();
      form.set("person", photo);
      if (referencePhoto) form.set("reference", referencePhoto);
      if (!referencePhoto && selectedProducts[0]) form.set("referenceUrl", selectedProducts[0].image);
      form.set("productIds", JSON.stringify(selectedProductIds));
      form.set("settings", JSON.stringify(settings));
      form.set("consent", JSON.stringify(consent));
      form.set("consentVersion", TRY_ON_CONSENT_VERSION);
      form.set("consentedAt", new Date().toISOString());
      setStatus("generating");

      requestController.current = new AbortController();
      const response = await fetch("/api/try-on", { method: "POST", body: form, signal: requestController.current.signal });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        const apiError = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
        if (apiError?.code === "AUTH_REQUIRED") {
          setStep("sign-in");
          return;
        }
        throw new Error(typeof apiError?.message === "string" ? apiError.message : "We could not create your preview. Please try again.");
      }
      const parsed = parseTryOnResponse(body);
      if (!parsed) throw new Error("The preview response was incomplete. Please try again.");
      setStatus("completed");
      setResult(parsed);
      setStep("result");
    } catch (generationError) {
      if (generationError instanceof DOMException && generationError.name === "AbortError") {
        setStatus("cancelled");
        setStep("review");
        return;
      }
      setStatus("failed");
      setError(generationError instanceof Error ? generationError.message : "We could not create your preview. Please try again.");
      setStep("review");
    } finally {
      requestController.current = null;
    }
  };

  if (step === "style-brief") return <section className="try-on-view style-me-brief" aria-labelledby="style-me-title">
    <small>YOUR PERSONAL STYLE EDIT</small>
    <h1 id="style-me-title">What are you dressing for?</h1>
    <p>Tell us a little about the moment. We will build a complete shoppable look from pieces available on StylishMe.</p>
    <fieldset><legend>Occasion</legend><div className="setting-grid style-options">{["Dinner", "Casual office", "Wedding guest", "Weekend", "Festival", "Sunday lunch"].map((value) => <button type="button" key={value} className={brief.occasion === value ? "selected" : ""} aria-pressed={brief.occasion === value} onClick={() => setBrief((current) => ({ ...current, occasion: value }))}>{value}</button>)}</div></fieldset>
    <div className="style-form-pair">
      <label><span>Location</span><select value={brief.location} onChange={(event) => setBrief((current) => ({ ...current, location: event.target.value }))}>{["Windhoek", "Swakopmund", "Walvis Bay", "Ongwediva", "Elsewhere in Namibia"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>When?</span><select value={brief.timing} onChange={(event) => setBrief((current) => ({ ...current, timing: event.target.value }))}>{["Today", "Tomorrow", "This weekend", "Choose later"].map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    <fieldset><legend>Budget for the full look</legend><div className="setting-grid two">{["N$1,500", "N$2,500", "N$4,000", "Flexible"].map((value) => <button type="button" key={value} className={brief.budget === value ? "selected" : ""} aria-pressed={brief.budget === value} onClick={() => setBrief((current) => ({ ...current, budget: value }))}>{value}</button>)}</div></fieldset>
    <fieldset><legend>Preferred colours</legend><div className="style-colours">{["Warm neutrals", "Black", "Bold colour", "Pastels"].map((value) => <button type="button" key={value} className={brief.colours.includes(value) ? "selected" : ""} aria-pressed={brief.colours.includes(value)} onClick={() => toggleBriefColour(value)}>{value}</button>)}</div></fieldset>
    <fieldset><legend>Your style</legend><div className="setting-grid two">{["Modern", "Minimal", "Statement", "Relaxed"].map((value) => <button type="button" key={value} className={brief.style === value ? "selected" : ""} aria-pressed={brief.style === value} onClick={() => setBrief((current) => ({ ...current, style: value }))}>{value}</button>)}</div></fieldset>
    <label className="owned-items"><span>Something you already own? <small>Optional</small></span><input value={brief.ownedItems} onChange={(event) => setBrief((current) => ({ ...current, ownedItems: event.target.value }))} placeholder="e.g. black trousers or white sneakers" /></label>
    <button className="gradient-button full" onClick={buildStyledLook}>Create my look</button>
    <button className="outline-button full" onClick={() => setStep("intro")}>I already have a look to try</button>
  </section>;

  if (step === "style-result") return <section className="try-on-view style-me-result" aria-labelledby="style-result-title">
    <button className="text-back" onClick={() => setStep("style-brief")}>Refine my brief</button>
    <small>STYLED FOR {brief.location.toUpperCase()}</small>
    <h1 id="style-result-title">{brief.occasion}, made yours.</h1>
    <p>A {brief.style.toLowerCase()} edit for {brief.timing.toLowerCase()}, kept close to your {brief.budget === "Flexible" ? "flexible budget" : `${brief.budget} budget`}.</p>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="styled-look-collage">{selectedProducts.map((product, index) => <button key={product.id} className={index === 0 ? "lead" : ""} onClick={() => onOpenProduct(product.id)}><img src={product.image} alt={product.name} /><span><small>{product.designer}</small><strong>{product.name}</strong><b>{money(product.price)}</b></span></button>)}</div>
    {brief.ownedItems && <div className="owned-item-note"><small>WORKING WITH YOUR WARDROBE</small><p>Keep your {brief.ownedItems}. This edit is built to complete it.</p></div>}
    <div className="try-on-result-total"><span>{selectedProducts.length} piece look</span><strong>{money(outfitTotal)}</strong></div>
    <button className="gradient-button full" disabled={!selectedProductIds.length} onClick={() => onAddLook(selectedProductIds)}>Add full look to cart</button>
    <button className="outline-button full" onClick={() => setStep(isSignedIn ? "consent" : "sign-in")}>See this look on me</button>
    <button className="style-shop-more" onClick={onContinueShopping}>Keep shopping</button>
  </section>;

  if (step === "intro") return <section className="try-on-view try-on-intro" aria-labelledby="try-on-title">
    <small>DIGITAL OUTFIT PREVIEW</small>
    <h1 id="try-on-title">Try On</h1>
    <p className="try-on-lead">See how a look could appear on you with a private digital preview.</p>
    <div className="try-on-intro-art"><img src={products[0]?.image} alt="Fashion look available for try-on" /><span>Private preview</span></div>
    <p className="try-on-disclaimer">{TRY_ON_DISCLAIMER}</p>
    <button className="gradient-button full" onClick={() => setStep(isSignedIn ? "consent" : "sign-in")}>Start Try-On</button>
    <button className="outline-button full" onClick={() => setStep("style-brief")}>Style me instead</button>
  </section>;

  if (step === "sign-in") return <section className="try-on-view try-on-intro" aria-labelledby="try-on-sign-in-title">
    <button className="text-back" onClick={() => setStep("intro")}>Back</button>
    <small>PRIVATE PREVIEW</small>
    <h1 id="try-on-sign-in-title">Sign in before adding your photo.</h1>
    <p className="try-on-lead">A secure account keeps this personal preview connected only to you and helps protect the feature from misuse.</p>
    <a className="gradient-button full try-on-sign-in" href={signInUrl}>Sign in securely</a>
    <button className="outline-button full" onClick={onContinueShopping}>Return to sign in</button>
  </section>;

  if (step === "consent") return <section className="try-on-view" aria-labelledby="try-on-consent-title">
    <button className="text-back" onClick={() => setStep("intro")}>Back</button>
    <small>YOUR PHOTO, YOUR CONTROL</small>
    <h1 id="try-on-consent-title">Before we begin</h1>
    <p>Confirm each statement before uploading a photo. You can delete your preview at any time.</p>
    <div className="consent-list">
      {consentRows.map(([key, label]) => <label key={key}><input type="checkbox" checked={consent[key]} onChange={(event) => setConsent((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span></label>)}
    </div>
    <button className="gradient-button full" disabled={!consentReady} onClick={() => setStep("photo")}>Continue to photo</button>
  </section>;

  if (step === "photo") return <section className="try-on-view" aria-labelledby="try-on-photo-title">
    <button className="text-back" onClick={() => setStep("consent")}>Back</button>
    <small>STEP 1 OF 4</small>
    <h1 id="try-on-photo-title">Add a full-length photo</h1>
    <div className="photo-guide"><span aria-hidden="true" /><div><strong>For the clearest preview</strong><ul><li>Face the camera</li><li>Keep head and feet visible</li><li>Use even lighting</li><li>Include only one person</li></ul></div></div>
    <label className="upload-card"><input aria-label="Upload full-length photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => handlePhoto(event.target.files?.[0] ?? null)} />{photoPreview ? <img src={photoPreview} alt="Selected full-length photo" /> : <span><strong>Take or upload a photo</strong><small>JPG, PNG or WebP · up to 10 MB</small></span>}</label>
    {photoMessage && <p className={photo ? "form-success" : "form-error"} role="status">{photoMessage}</p>}
    <button className="gradient-button full" disabled={!photo} onClick={() => setStep("source")}>Choose outfit</button>
  </section>;

  if (step === "source") return <section className="try-on-view" aria-labelledby="try-on-source-title">
    <button className="text-back" onClick={() => setStep("photo")}>Back</button>
    <small>STEP 2 OF 4</small>
    <h1 id="try-on-source-title">Choose what to try</h1>
    <p>Select up to four StylishMe pieces, or add one outfit reference of your own.</p>
    <div className="try-on-product-picker">
      {products.slice(0, 8).map((product) => {
        const selected = selectedProductIds.includes(product.id);
        return <button key={product.id} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => toggleProduct(product.id)}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{money(product.price)}</small></span><b>{selected ? "Selected" : "Select"}</b></button>;
      })}
    </div>
    <label className="reference-upload"><span><strong>Upload an external reference</strong><small>Screenshot or outfit inspiration</small></span><input aria-label="Upload outfit reference" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleReference(event.target.files?.[0] ?? null)} /></label>
    {referencePhoto && <p className="form-success">Reference ready · {referencePhoto.name}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="gradient-button full" disabled={!selectedProductIds.length && !referencePhoto} onClick={() => setStep("settings")}>Continue to settings</button>
  </section>;

  if (step === "settings") return <section className="try-on-view" aria-labelledby="try-on-settings-title">
    <button className="text-back" onClick={() => setStep("source")}>Back</button>
    <small>STEP 3 OF 4</small>
    <h1 id="try-on-settings-title">Preview settings</h1>
    <fieldset><legend>Transfer from the look</legend><div className="setting-grid">{(["outfit-only", "outfit-and-shoes", "complete-look"] as const).map((value) => <button type="button" key={value} className={settings.transfer === value ? "selected" : ""} aria-pressed={settings.transfer === value} onClick={() => setSettings((current) => ({ ...current, transfer: value }))}>{value === "outfit-only" ? "Outfit only" : value === "outfit-and-shoes" ? "Outfit and shoes" : "Complete look"}</button>)}</div></fieldset>
    <fieldset><legend>Background</legend><div className="setting-grid two">{(["preserve", "studio"] as const).map((value) => <button type="button" key={value} className={settings.background === value ? "selected" : ""} aria-pressed={settings.background === value} onClick={() => setSettings((current) => ({ ...current, background: value }))}>{value === "preserve" ? "Keep my background" : "Clean studio"}</button>)}</div></fieldset>
    <div className="privacy-note"><strong>Private by design</strong><span>Your photo is used only to prepare this preview and is not added to your wardrobe.</span></div>
    <button className="gradient-button full" onClick={() => setStep("review")}>Review preview</button>
  </section>;

  if (step === "generating") return <section className="try-on-view try-on-progress" aria-live="polite" aria-labelledby="try-on-progress-title">
    <div className="progress-orbit"><span /><IconSparkles /></div>
    <small>DIGITAL OUTFIT PREVIEW</small>
    <h1 id="try-on-progress-title">{progressMessage(status)}</h1>
    <p>Keep this screen open while your private preview is prepared. Detailed looks can take up to two minutes.</p>
    <button className="outline-button full" onClick={() => requestController.current?.abort()}>Cancel preview</button>
  </section>;

  if (step === "result" && result) return <section className="try-on-view try-on-result" aria-labelledby="try-on-result-title">
    <small>Digitally created outfit preview</small>
    <h1 id="try-on-result-title">Your preview is ready</h1>
    <div className="try-on-comparison">{photoPreview && <figure><img src={photoPreview} alt="Original upload" /><figcaption>Original</figcaption></figure>}<figure><img src={`data:${result.mimeType};base64,${result.imageBase64}`} alt="Digitally created outfit preview" /><figcaption>Preview</figcaption></figure></div>
    <p className="try-on-disclaimer">{TRY_ON_DISCLAIMER}</p>
    <div className="try-on-result-total"><span>{selectedProducts.length} {selectedProducts.length === 1 ? "piece" : "pieces"}</span><strong>{money(outfitTotal)}</strong></div>
    <div className="try-on-products">{selectedProducts.map((product) => <article key={product.id}><button className="try-on-product-main" onClick={() => onOpenProduct(product.id)}><img src={product.image} alt="" /><span><small>{product.designer}</small><strong>{product.name}</strong><b>{money(product.price)}</b></span></button><button className="outline-button" onClick={() => onAddProduct(product.id)} aria-label={`Add ${product.name} to cart`}>Add</button></article>)}</div>
    <button className="gradient-button full" onClick={() => onAddLook(selectedProductIds)}>Add full look to cart</button>
    <div className="result-actions"><button onClick={() => { setResult(null); setStep("settings"); }}>Remix</button><button onClick={reset}>Try another outfit</button><button onClick={reset}>Delete preview</button></div>
  </section>;

  return <section className="try-on-view" aria-labelledby="try-on-review-title">
    <button className="text-back" onClick={() => setStep("settings")}>Back</button>
    <small>STEP 4 OF 4</small>
    <h1 id="try-on-review-title">Review your preview</h1>
    <div className="review-photo">{photoPreview && <img src={photoPreview} alt="Full-length photo ready for preview" />}<span><strong>{photo?.name}</strong><small>Processed privately for this preview</small></span></div>
    <div className="try-on-review-products">{selectedProducts.map((product) => <div key={product.id}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{money(product.price)}</small></span></div>)}</div>
    <div className="privacy-note"><strong>Your photo stays private</strong><span>Delete the preview at any time and it disappears from this session.</span></div>
    <p className="try-on-disclaimer">{TRY_ON_DISCLAIMER}</p>
    {error && <div className="try-on-error" role="alert"><strong>Preview unavailable</strong><p>{error}</p><button className="outline-button" onClick={onContinueShopping}>Continue shopping</button></div>}
    <button className="gradient-button full" disabled={!photo || (!selectedProducts.length && !referencePhoto)} onClick={generatePreview}>Create Preview</button>
  </section>;
}

function IconSparkles() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z" /><path d="m18.5 14 .72 2.28L21.5 17l-2.28.72L18.5 20l-.72-2.28L15.5 17l2.28-.72L18.5 14Z" /></svg>;
}
