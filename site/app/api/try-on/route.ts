import OpenAI from "openai";

import { getStylishMeUser } from "../../stylishme-auth";
import { buildProduct } from "../../product-catalog";
import {
  buildTryOnPrompt,
  TRY_ON_CONSENT_VERSION,
  type TryOnConsent,
  type TryOnSettings,
  validateTryOnConsent,
  validateTryOnFile,
} from "../../try-on-domain";

type AuthenticatedCustomer = { email: string };

type GenerateInput = {
  person: File;
  references: File[];
  prompt: string;
  model: string;
  size: "1024x1536";
  quality: "high";
};

type GeneratedImage = {
  imageBase64: string;
  mimeType: string;
};

export type TryOnServices = {
  authenticate: () => Promise<AuthenticatedCustomer | null>;
  fetchReference: (url: string) => Promise<File>;
  moderate: (file: File) => Promise<boolean>;
  generate: (input: GenerateInput) => Promise<GeneratedImage>;
  consumeQuota?: (email: string, now: Date) => Promise<{ ok: boolean; retryAfterSeconds?: number }>;
  model: string;
  now: () => Date;
};

const catalogue = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const consentWindowMs = 24 * 60 * 60 * 1000;

function apiError(status: number, code: string, message: string, requestId = crypto.randomUUID(), retryAfterSeconds?: number) {
  const headers: Record<string, string> = { "cache-control": "no-store", "x-request-id": requestId };
  if (retryAfterSeconds) headers["retry-after"] = String(retryAfterSeconds);
  return Response.json({ error: { code, message, requestId } }, { status, headers });
}

function parseStringArray(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length > 4 || parsed.some((item) => typeof item !== "string")) return null;
    return [...new Set(parsed)];
  } catch {
    return null;
  }
}

function parseSettings(value: FormDataEntryValue | null): TryOnSettings | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as Partial<TryOnSettings>;
    if (
      !["outfit-only", "outfit-and-shoes", "complete-look"].includes(parsed.transfer ?? "")
      || !["preserve", "studio"].includes(parsed.background ?? "")
      || parsed.styling !== "natural"
    ) return null;
    return parsed as TryOnSettings;
  } catch {
    return null;
  }
}

function validConsent(form: FormData, now: Date) {
  if (form.get("consentVersion") !== TRY_ON_CONSENT_VERSION) return false;
  const consentedAt = form.get("consentedAt");
  if (typeof consentedAt !== "string") return false;
  const timestamp = Date.parse(consentedAt);
  if (!Number.isFinite(timestamp)) return false;
  const age = now.getTime() - timestamp;
  if (age < -5 * 60 * 1000 || age > consentWindowMs) return false;
  const raw = form.get("consent");
  if (typeof raw !== "string") return false;
  try {
    return validateTryOnConsent(JSON.parse(raw) as TryOnConsent).ok;
  } catch {
    return false;
  }
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function validImage(file: File) {
  return validateTryOnFile({ name: file.name, type: file.type, size: file.size });
}

function approvedCatalogueReferences(referenceUrl: string, productIds: string[]) {
  const products = productIds.flatMap((id) => {
    const product = catalogue.find((item) => item.id === id);
    return product ? [product] : [];
  });
  if (products.length !== productIds.length || products[0]?.image !== referenceUrl) return null;
  return products;
}

export function createTryOnHandler(services: TryOnServices) {
  return async function handleTryOn(request: Request) {
    const requestId = crypto.randomUUID();
    const customer = await services.authenticate();
    if (!customer) {
      return apiError(401, "AUTH_REQUIRED", "Sign in securely to create a private try-on preview.", requestId);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiError(400, "INVALID_REQUEST", "The try-on request could not be read.", requestId);
    }

    if (!validConsent(form, services.now())) {
      return apiError(400, "CONSENT_REQUIRED", "Please confirm the latest try-on consent statements again.", requestId);
    }

    const person = form.get("person");
    if (!isFile(person) || !validImage(person).ok) {
      return apiError(400, "INVALID_PERSON_IMAGE", "Choose a JPG, PNG, or WebP photo smaller than 10 MB.", requestId);
    }

    const productIds = parseStringArray(form.get("productIds"));
    const settings = parseSettings(form.get("settings"));
    if (!productIds || !settings) {
      return apiError(400, "INVALID_REQUEST", "Choose a valid outfit and preview setting.", requestId);
    }

    let references: File[];
    const uploadedReference = form.get("reference");
    if (isFile(uploadedReference)) {
      if (!validImage(uploadedReference).ok) {
        return apiError(400, "INVALID_REFERENCE", "Choose a JPG, PNG, or WebP outfit reference smaller than 10 MB.", requestId);
      }
      references = [uploadedReference];
    } else {
      const referenceUrl = form.get("referenceUrl");
      const approved = typeof referenceUrl === "string" ? approvedCatalogueReferences(referenceUrl, productIds) : null;
      if (!approved?.length) {
        return apiError(400, "INVALID_REFERENCE", "Choose an outfit from the current StylishMe catalogue.", requestId);
      }
      try {
        references = await Promise.all(approved.map((product) => services.fetchReference(new URL(product.image, request.url).toString())));
      } catch {
        return apiError(503, "REFERENCE_UNAVAILABLE", "That outfit image is temporarily unavailable. Please choose another look.", requestId);
      }
      if (references.some((reference) => !validImage(reference).ok)) {
        return apiError(400, "INVALID_REFERENCE", "The selected outfit image is not supported.", requestId);
      }
    }

    try {
      if (services.consumeQuota) {
        const quota = await services.consumeQuota(customer.email, services.now());
        if (!quota.ok) {
          return apiError(429, "RATE_LIMITED", "You have reached the preview limit for this hour. Try again shortly.", requestId, quota.retryAfterSeconds);
        }
      }
      const moderation = await Promise.all([person, ...references].map((file) => services.moderate(file)));
      if (moderation.some(Boolean)) {
        return apiError(422, "IMAGE_NOT_ALLOWED", "Choose clear, fully clothed fashion images containing one adult.", requestId);
      }

      const generated = await services.generate({
        person,
        references,
        prompt: buildTryOnPrompt(settings),
        model: services.model,
        size: "1024x1536",
        quality: "high",
      });
      if (!generated.imageBase64 || !generated.mimeType.startsWith("image/")) {
        throw new Error("Incomplete image response");
      }

      return Response.json({ ...generated, model: services.model }, {
        headers: { "cache-control": "no-store", "x-request-id": requestId },
      });
    } catch (error) {
      console.error("try-on request failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
      return apiError(503, "TRY_ON_UNAVAILABLE", "Try-on is temporarily unavailable. Shopping is still open.", requestId);
    }
  };
}

let openAIClient: OpenAI | null = null;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.Stylishme;
  if (!apiKey) throw new Error("OpenAI is not configured");
  openAIClient ??= new OpenAI({ apiKey });
  return openAIClient;
}

async function fetchCatalogueReference(url: string) {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error("Reference fetch failed");
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > 10 * 1024 * 1024) throw new Error("Reference too large");
  const blob = await response.blob();
  const type = blob.type || response.headers.get("content-type")?.split(";")[0] || "";
  return new File([blob], "catalogue-reference", { type });
}

async function fileDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${file.type};base64,${btoa(binary)}`;
}

async function moderateImage(file: File) {
  const response = await getOpenAI().moderations.create({
    model: "omni-moderation-latest",
    input: [{ type: "image_url", image_url: { url: await fileDataUrl(file) } }],
  });
  return response.results.some((result) => result.flagged);
}

async function generateImage(input: GenerateInput): Promise<GeneratedImage> {
  const response = await getOpenAI().images.edit({
    model: input.model,
    image: [input.person, ...input.references],
    prompt: input.prompt,
    size: input.size,
    quality: input.quality,
    n: 1,
    output_format: "jpeg",
    output_compression: 86,
  });
  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) throw new Error("Image generation returned no result");
  return { imageBase64, mimeType: "image/jpeg" };
}

async function consumeTryOnQuota(email: string, now: Date) {
  const [{ eq }, { getDb }, { tryOnUsage }] = await Promise.all([
    import("drizzle-orm"),
    import("../../../db"),
    import("../../../db/schema"),
  ]);
  const windowStart = new Date(now);
  windowStart.setUTCMinutes(0, 0, 0);
  const key = `${email}:${windowStart.toISOString()}`;
  const db = getDb();
  const [row] = await db.select().from(tryOnUsage).where(eq(tryOnUsage.key, key)).limit(1);
  if (row && row.count >= 5) {
    const nextWindow = windowStart.getTime() + 60 * 60 * 1000;
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((nextWindow - now.getTime()) / 1000)) };
  }
  const values = {
    key,
    email,
    count: (row?.count ?? 0) + 1,
    windowStart: windowStart.toISOString(),
    updatedAt: now.toISOString(),
  };
  await db.insert(tryOnUsage).values(values).onConflictDoUpdate({ target: tryOnUsage.key, set: values });
  return { ok: true };
}

const productionServices: TryOnServices = {
  authenticate: getStylishMeUser,
  fetchReference: fetchCatalogueReference,
  moderate: moderateImage,
  generate: generateImage,
  consumeQuota: consumeTryOnQuota,
  model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
  now: () => new Date(),
};

export async function POST(request: Request) {
  return createTryOnHandler(productionServices)(request);
}
