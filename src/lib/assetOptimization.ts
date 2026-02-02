/**
 * Asset optimization utilities for images and resources
 */

// Image quality presets for different use cases
export const IMAGE_QUALITY_PRESETS = {
  thumbnail: { width: 150, height: 150, quality: 60 },
  preview: { width: 400, height: 400, quality: 70 },
  standard: { width: 800, height: 800, quality: 80 },
  high: { width: 1200, height: 1200, quality: 85 },
  full: { width: 1920, height: 1920, quality: 90 },
} as const;

export type ImageQualityPreset = keyof typeof IMAGE_QUALITY_PRESETS;

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseSrc: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  // For Supabase storage or similar CDNs that support width parameters
  if (baseSrc.includes("supabase.co/storage")) {
    return widths
      .map((w) => `${baseSrc}?width=${w} ${w}w`)
      .join(", ");
  }
  
  // Return original for other sources
  return baseSrc;
}

/**
 * Get optimal image format based on browser support
 */
export async function getOptimalFormat(): Promise<"avif" | "webp" | "jpg"> {
  // Check AVIF support
  try {
    const avifSupport = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width === 1);
      img.onerror = () => resolve(false);
      img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQA=";
    });
    if (avifSupport) return "avif";
  } catch {
    // AVIF not supported
  }

  // Check WebP support
  try {
    const webpSupport = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width === 1);
      img.onerror = () => resolve(false);
      img.src = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";
    });
    if (webpSupport) return "webp";
  } catch {
    // WebP not supported
  }

  return "jpg";
}

/**
 * Calculate optimal image dimensions while maintaining aspect ratio
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Create a placeholder blur data URL
 */
export function createBlurPlaceholder(width = 10, height = 10): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  
  if (ctx) {
    // Create gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f0f0f0");
    gradient.addColorStop(1, "#e0e0e0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL("image/jpeg", 0.1);
}

/**
 * Estimate file size from base64 string
 */
export function estimateBase64Size(base64: string): number {
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
