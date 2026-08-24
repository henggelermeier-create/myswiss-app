import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { TransferPackage } from "@/lib/transfer-package";
import type { SignedReleaseManifest } from "@/lib/edge-release-manifest";

export const PORTAL_BASE_URL = "https://schiessportal.com";
const APP_API = "/api/public/app/box";
export const PORTAL_PROBE_TIMEOUT_MS = 4000;
export const PORTAL_PROBE_MARKER = "schiessportal";

export type RedeemQrResult = {
  token: string;
  expires_at: string;
  club_name: string;
  device_id: string | null;
};

function normalizeData(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function errorFromData(data: unknown, status: number): Error {
  const message =
    data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : `Portal antwortet nicht (${status}).`;
  return new Error(message);
}

function portalOfflineError(): Error {
  return new Error("Schiessportal konnte nicht erreicht werden. Bitte Internetverbindung prüfen und nochmals versuchen.");
}

async function portalFetch<T>(path: string, token: string | null, body?: unknown): Promise<T> {
  const url = `${PORTAL_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.request({
        url,
        method: "POST",
        headers,
        data: body ?? {},
        connectTimeout: 6000,
        readTimeout: 12000,
      });
      const data = normalizeData(res.data);
      if (res.status < 200 || res.status >= 300) throw errorFromData(data, res.status);
      return data as T;
    } catch (err) {
      if (err instanceof Error && !/Failed to fetch|Network Error|ERR_/i.test(err.message)) throw err;
      throw portalOfflineError();
    }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
    const data = normalizeData(await res.text());
    if (!res.ok) throw errorFromData(data, res.status);
    return data as T;
  } catch (err) {
    if (err instanceof Error && !/Failed to fetch|Network Error/i.test(err.message)) throw err;
    throw portalOfflineError();
  }
}

export function redeemBoxQr(qrToken: string) {
  return portalFetch<RedeemQrResult>(`${APP_API}/redeem`, null, { token: qrToken });
}

export function buildDownstreamPackage(sessionToken: string) {
  return portalFetch<TransferPackage>(`${APP_API}/downstream`, sessionToken);
}

export function receiveUpstreamPackage(sessionToken: string, pkg: TransferPackage) {
  return portalFetch<{ receipt: TransferPackage }>(`${APP_API}/upstream`, sessionToken, pkg);
}

export function fetchReleaseManifest(sessionToken: string) {
  return portalFetch<SignedReleaseManifest>(`${APP_API}/release`, sessionToken);
}

export function evaluatePortalProbe(status: number, body: unknown): boolean {
  if (status < 200 || status >= 300) return false;
  const data = body as { ok?: unknown; service?: unknown } | null;
  return Boolean(data && data.ok === true && data.service === PORTAL_PROBE_MARKER);
}

export type ProbeDeps = { fetchImpl?: typeof fetch; timeoutMs?: number };

export async function isPortalReachable(deps: ProbeDeps = {}): Promise<boolean> {
  const timeoutMs = deps.timeoutMs ?? PORTAL_PROBE_TIMEOUT_MS;

  if (Capacitor.isNativePlatform() && !deps.fetchImpl) {
    try {
      const res = await CapacitorHttp.request({
        url: `${PORTAL_BASE_URL}${APP_API}/ping`,
        method: "POST",
        headers: { "content-type": "application/json" },
        data: {},
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      return evaluatePortalProbe(res.status, normalizeData(res.data));
    } catch {
      return false;
    }
  }

  const doFetch = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await doFetch(`${PORTAL_BASE_URL}${APP_API}/ping`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    return evaluatePortalProbe(res.status, body);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
