// Post-login intended-destination guard (Onboarding Standard A7).
// Only same-origin relative paths with an allow-listed prefix survive the
// login round-trip; everything else falls back to the default landing route.
// Prevents open-redirect via ?redirect= / sessionStorage.authReturnUrl
// (e.g. `//evil.com`, `/\evil.com`, `https://evil.com`), and resolves
// dot-segments (e.g. /dashboard/../../settings) via URL normalization so the
// allow-list check runs against the actual resolved path, not the raw string.
//
// Allow-list derived from the authenticated route prefixes in src/App.tsx.
const ALLOWED_PREFIXES = [
  "/projects",
  "/dashboard",
  "/admin",
  "/settings",
  "/master-library",
  "/contact-library",
  "/client-portal",
  "/client",
  "/handover-client",
  "/handover-client-management",
];

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;

  let resolved: URL;
  try {
    resolved = new URL(raw, "http://internal.invalid");
  } catch {
    return null;
  }
  if (resolved.origin !== "http://internal.invalid") return null; // defense-in-depth

  const path = resolved.pathname + resolved.search; // dot-segments collapsed by URL
  const ok = ALLOWED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
  return ok ? path : null; // return the NORMALIZED value, never raw
}
