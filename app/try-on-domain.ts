export const TRY_ON_DISCLAIMER = "This is a visual style preview. It does not guarantee exact sizing, tailoring, material behaviour, or real-world fit.";
export const TRY_ON_CONSENT_VERSION = "2026-07-19";
export const TRY_ON_MAX_BYTES = 10 * 1024 * 1024;

export type TryOnJobStatus =
  | "queued"
  | "validating"
  | "moderation_failed"
  | "preparing"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled"
  | "deleted";

export type TryOnConsent = {
  ownsImage: boolean;
  understandsAi: boolean;
  acceptsPrivacy: boolean;
  confirmsAdult: boolean;
};

export type TryOnSettings = {
  transfer: "outfit-only" | "outfit-and-shoes" | "complete-look";
  background: "preserve" | "studio";
  styling: "natural";
};

export type TryOnFileMeta = {
  name: string;
  type: string;
  size: number;
};

export type TryOnImageResult = {
  imageBase64: string;
  mimeType: string;
  model: string;
};

export function validateTryOnConsent(consent: TryOnConsent) {
  return Object.values(consent).every(Boolean)
    ? { ok: true as const, message: "" }
    : { ok: false as const, message: "Confirm every consent statement to continue." };
}

export function validateTryOnFile(file: TryOnFileMeta) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false as const, message: "Choose a JPG, PNG, or WebP image." };
  }
  if (!file.size || file.size > TRY_ON_MAX_BYTES) {
    return { ok: false as const, message: "Choose an image smaller than 10 MB." };
  }
  return { ok: true as const, message: "Photo ready" };
}

export function progressMessage(status: TryOnJobStatus) {
  const messages: Partial<Record<TryOnJobStatus, string>> = {
    queued: "Preparing your preview",
    validating: "Checking your images",
    preparing: "Preparing the outfit",
    generating: "Creating your preview",
    completed: "Finishing the details",
  };
  return messages[status] ?? "Preparing your preview";
}

export function buildTryOnPrompt(settings: TryOnSettings) {
  const transfer = settings.transfer === "outfit-only"
    ? "outfit only"
    : settings.transfer === "outfit-and-shoes"
      ? "outfit and shoes"
      : "complete look";
  const background = settings.background === "studio"
    ? "Use a clean, understated studio background."
    : "Preserve the original background.";

  return `Create a photorealistic full-length fashion preview. The first image is the customer and all remaining images are garment references for one coordinated look. Preserve the identity, face, skin tone, hairstyle, age appearance, body proportions, pose, and recognizable appearance of the person in the first image. Transfer the ${transfer} from the garment reference images, combining only the visible clothing pieces that work together. Do not copy any reference person's identity, face, body, or pose. Do not reshape the customer's body or change facial structure. ${background} Use natural styling, realistic garment construction, accurate colours, and realistic lighting. Do not add unrelated text, logos, people, clothing, or accessories.`;
}

export function parseTryOnResponse(value: unknown): TryOnImageResult | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  if (
    typeof response.imageBase64 !== "string"
    || !response.imageBase64
    || typeof response.mimeType !== "string"
    || !response.mimeType.startsWith("image/")
    || typeof response.model !== "string"
    || !response.model
  ) return null;

  return {
    imageBase64: response.imageBase64,
    mimeType: response.mimeType,
    model: response.model,
  };
}
