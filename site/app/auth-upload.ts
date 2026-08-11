export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const allowedProfilePhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function profilePhotoError(file: File | null | undefined) {
  if (!file?.size) return "Choose a JPG, PNG or WebP profile photo.";
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return "That profile photo is too large. Choose one under 5 MB.";
  if (!allowedProfilePhotoTypes.has(file.type)) return "Choose a JPG, PNG or WebP profile photo.";
  return "";
}

export async function readAuthResponse<T extends { error?: string }>(response: Response, fallback: string): Promise<T> {
  if (response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    try {
      return await response.json() as T;
    } catch {
      // A malformed upstream response is handled with the safe fallback below.
    }
  }
  return {
    error: response.status === 413
      ? "That profile photo is too large. Choose one under 5 MB."
      : fallback,
  } as T;
}
