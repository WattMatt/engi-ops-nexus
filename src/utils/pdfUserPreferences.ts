import type { QualityPreset } from "./pdfQualitySettings";

/**
 * Get the user's preferred PDF quality preset from localStorage
 * Falls back to 'standard' if not set
 */
export function getUserQualityPreset(): QualityPreset {
  const saved = localStorage.getItem("pdf-quality-preset");
  if (saved === "draft" || saved === "standard" || saved === "high") {
    return saved;
  }
  return "standard"; // Default
}

/**
 * Set the user's preferred PDF quality preset
 */
export function setUserQualityPreset(preset: QualityPreset): void {
  localStorage.setItem("pdf-quality-preset", preset);
}
