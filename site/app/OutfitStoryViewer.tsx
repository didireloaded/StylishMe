"use client";

/* Story photography is intentionally rendered at its native crop. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

import type { Outfit, OutfitStory } from "./outfit-catalog";
import { canAutoAdvance, getFocusWrapIndex, getStoryIndex, STORY_DURATION } from "./outfit-story-behavior";

export type StoryProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  available: boolean;
};

type Props = {
  stories: OutfitStory[];
  outfits: Outfit[];
  products: StoryProduct[];
  initialStoryId: string;
  restoreFocusTo: HTMLElement | null;
  savedOutfitIds: string[];
  onSave: (outfitId: string) => void;
  onAddAll: (outfitId: string) => void;
  onViewOutfit: (outfitId: string) => void;
  onClose: () => void;
};

const money = (value: number) => `N$${value.toLocaleString("en-US")}`;

export default function OutfitStoryViewer({
  stories,
  outfits,
  products,
  initialStoryId,
  restoreFocusTo,
  savedOutfitIds,
  onSave,
  onAddAll,
  onViewOutfit,
  onClose,
}: Props) {
  const requestedInitialIndex = stories.findIndex((story) => story.id === initialStoryId);
  const initialIndex = requestedInitialIndex >= 0 ? requestedInitialIndex : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [progressCycle, setProgressCycle] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const currentStory = stories[activeIndex] ?? stories[0];
  const currentOutfit = outfits.find((outfit) => outfit.id === currentStory?.outfitId);
  const outfitProducts = useMemo(
    () => currentOutfit?.productIds.flatMap((id) => {
      const product = products.find((item) => item.id === id);
      return product ? [product] : [];
    }) ?? [],
    [currentOutfit, products],
  );

  useEffect(() => {
    const fallbackPreviouslyFocused = restoreFocusTo
      ? null
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    return () => {
      const focusTarget = restoreFocusTo ?? fallbackPreviouslyFocused;
      focusTarget?.focus();
    };
  }, [restoreFocusTo]);

  useEffect(() => {
    if (stories.length <= 1) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const scheduleNextStory = (resetProgress = false) => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      if (!canAutoAdvance(document.hidden, reducedMotion.matches)) return;
      if (resetProgress) setProgressCycle((cycle) => cycle + 1);
      timer = window.setTimeout(() => {
        setActiveIndex((index) => getStoryIndex(index + 1, stories.length));
      }, STORY_DURATION);
    };

    scheduleNextStory();
    const handleEnvironmentChange = () => scheduleNextStory(true);
    document.addEventListener("visibilitychange", handleEnvironmentChange);
    reducedMotion.addEventListener("change", handleEnvironmentChange);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleEnvironmentChange);
      reducedMotion.removeEventListener("change", handleEnvironmentChange);
    };
  }, [activeIndex, stories.length]);

  if (!currentStory || !currentOutfit) return null;

  const goToStory = (index: number) => {
    setActiveIndex(getStoryIndex(index, stories.length));
  };
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const focusTargetIndex = getFocusWrapIndex(activeIndex, focusable.length, event.shiftKey);
    if (focusTargetIndex === null) return;
    event.preventDefault();
    focusable[focusTargetIndex].focus();
  };
  const total = outfitProducts.reduce((sum, product) => sum + product.price, 0);
  const availableCount = outfitProducts.filter((product) => product.available).length;
  const isSaved = savedOutfitIds.includes(currentOutfit.id);

  return (
    <section
      className="story-viewer"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${currentOutfit.title} outfit story`}
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      style={{ backgroundImage: `url(${currentStory.image})` }}
    >
      <div className="story-viewer-content">
        <div className="story-progress" aria-label="Outfit story progress">
          {stories.map((story, index) => (
            <button
              key={story.id}
              className={index === activeIndex ? "active" : index < activeIndex ? "complete" : ""}
              onClick={() => goToStory(index)}
              aria-label={`View ${story.label}`}
              aria-current={index === activeIndex ? "step" : undefined}
            >
              <span><i key={`${currentStory.id}-${progressCycle}`} /></span>
            </button>
          ))}
        </div>

        <button ref={closeButtonRef} className="story-close" onClick={onClose} aria-label="Close outfit stories">×</button>
        <button className="story-hit-area previous" onClick={() => goToStory(activeIndex - 1)} aria-label="Previous outfit story" />
        <button className="story-hit-area next" onClick={() => goToStory(activeIndex + 1)} aria-label="Next outfit story" />

        <div className="story-copy-panel">
          <small>{currentStory.label.toUpperCase()} · {currentOutfit.location.toUpperCase()}</small>
          <h1>{currentOutfit.title}</h1>
          <p>{currentOutfit.note}</p>
        </div>

        <div className="story-commerce">
          <div className="story-product-tray">
            <div className="story-product-thumbnails" aria-label="Products in this outfit">
              {outfitProducts.map((product) => (
                <div className={product.available ? "" : "unavailable"} key={product.id}>
                  <img src={product.image} alt={product.name} />
                  {!product.available && <span>Unavailable</span>}
                </div>
              ))}
            </div>
            <p><span>{outfitProducts.length} pieces</span><strong>{money(total)}</strong></p>
          </div>

          <div className="story-actions">
            <button className="story-save" aria-pressed={isSaved} onClick={() => onSave(currentOutfit.id)}>
              {isSaved ? "Saved Outfit" : "Save Outfit"}
            </button>
            <button className="story-add" onClick={() => availableCount ? onAddAll(currentOutfit.id) : onViewOutfit(currentOutfit.id)}>
              {availableCount ? "Add All to Cart" : "View Similar"}
            </button>
            <button className="story-view" onClick={() => onViewOutfit(currentOutfit.id)}>View Outfit</button>
          </div>
        </div>
      </div>
    </section>
  );
}
