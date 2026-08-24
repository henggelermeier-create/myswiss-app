type SecureApi = {
  get(o: { key: string }): Promise<{ value: string }>;
  set(o: { key: string; value: string }): Promise<{ value: boolean }>;
  remove(o: { key: string }): Promise<{ value: boolean }>;
};
function isNative(): boolean {
  const anyWin = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(anyWin.Capacitor?.isNativePlatform?.());
}
let cached: SecureApi | null = null;
async function nativeStore(): Promise<SecureApi | null> {
  if (!isNative()) return null;
  if (cached) return cached;
  try {
    const mod = await import("capacitor-secure-storage-plugin");
    cached = mod.SecureStoragePlugin as unknown as SecureApi;
    return cached;
  } catch { return null; }
}
export const secureStore = {
  async get(key: string): Promise<string | null> {
    const api = await nativeStore();
    if (!api) { try { return sessionStorage.getItem(key); } catch { return null; } }
    try { const { value } = await api.get({ key }); return value || null; } catch { return null; }
  },
  async set(key: string, value: string): Promise<void> {
    const api = await nativeStore();
    if (!api) { try { sessionStorage.setItem(key, value); } catch {} return; }
    await api.set({ key, value });
  },
  async remove(key: string): Promise<void> {
    const api = await nativeStore();
    if (!api) { try { sessionStorage.removeItem(key); } catch {} return; }
    try { await api.remove({ key }); } catch {}
  },
};
