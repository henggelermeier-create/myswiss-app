type SecureApi = {
  get(o: { key: string }): Promise<{ value: string }>;
  set(o: { key: string; value: string }): Promise<{ value: boolean }>;
  remove(o: { key: string }): Promise<{ value: boolean }>;
};

const SECURE_TIMEOUT_MS = 1800;

function isNative(): boolean {
  const anyWin = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(anyWin.Capacitor?.isNativePlatform?.());
}

function withTimeout<T>(promise: Promise<T>, ms = SECURE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Secure Storage Timeout")), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

let cached: SecureApi | null = null;
async function nativeStore(): Promise<SecureApi | null> {
  if (!isNative()) return null;
  if (cached) return cached;
  try {
    const mod = await withTimeout(import("capacitor-secure-storage-plugin"));
    cached = mod.SecureStoragePlugin as unknown as SecureApi;
    return cached;
  } catch {
    return null;
  }
}

export const secureStore = {
  async get(key: string): Promise<string | null> {
    const api = await nativeStore();
    if (!api) {
      try { return sessionStorage.getItem(key); } catch { return null; }
    }
    try {
      const { value } = await withTimeout(api.get({ key }));
      return value || null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    const api = await nativeStore();
    if (!api) {
      try { sessionStorage.setItem(key, value); } catch {}
      return;
    }
    try {
      await withTimeout(api.set({ key, value }));
    } catch {
      throw new Error("Sicherer Speicher reagiert nicht. App bitte nochmals öffnen und erneut koppeln.");
    }
  },

  async remove(key: string): Promise<void> {
    const api = await nativeStore();
    if (!api) {
      try { sessionStorage.removeItem(key); } catch {}
      return;
    }
    try { await withTimeout(api.remove({ key })); } catch {}
  },
};
