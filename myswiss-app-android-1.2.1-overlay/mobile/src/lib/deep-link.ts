export type BoxPairingLink = { token: string };
const CUSTOM_SCHEME_RE = /^schiessportal:\/\/box\/([^/?#]+)/i;
const UNIVERSAL_LINK_RE = /^https:\/\/schiessportal\.com\/app\/box\/([^/?#]+)/i;
export function parseBoxPairingUrl(url: string | null | undefined): BoxPairingLink | null {
  if (!url) return null; const match = CUSTOM_SCHEME_RE.exec(url.trim()) ?? UNIVERSAL_LINK_RE.exec(url.trim());
  if (!match) return null; const token = decodeURIComponent(match[1] ?? ""); return token ? { token } : null;
}
export function normaliseManualCode(input: string): string { return input.trim().replace(/\s+/g, "").toUpperCase(); }
