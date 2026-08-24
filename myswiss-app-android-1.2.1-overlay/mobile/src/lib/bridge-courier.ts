export type CourierMode = "kurier" | "internet_bruecke" | "kein_handy";
export type RelayStepResult = { ok: boolean; done: boolean; step?: string; label?: string; error?: string };
export function courierMode(boxReachable: boolean, portalReachable: boolean): CourierMode {
  if (!boxReachable) return "kein_handy";
  return portalReachable ? "internet_bruecke" : "kurier";
}
export type BridgeRunPorts = {
  prepare: () => Promise<{ ok: boolean; done: boolean; url?: string; bundle?: unknown; step?: string; label?: string; error?: string }>;
  send: (url: string, bundle: unknown) => Promise<unknown>;
  apply: (answer: unknown) => Promise<RelayStepResult>;
  onStep?: (label: string) => void;
};
export const MAX_BRIDGE_STEPS = 40;
export async function runInternetBridge(ports: BridgeRunPorts): Promise<{ ok: boolean; steps: number; message: string }> {
  let steps = 0;
  while (steps < MAX_BRIDGE_STEPS) {
    const prepared = await ports.prepare();
    if (prepared.done) return { ok: true, steps, message: "Alles übertragen." };
    if (!prepared.ok || !prepared.bundle || !prepared.url) return { ok: false, steps, message: prepared.error ?? "Die Box konnte nichts vorbereiten." };
    if (prepared.label) ports.onStep?.(prepared.label);
    let answer: unknown;
    try { answer = await ports.send(prepared.url, prepared.bundle); }
    catch (err) { return { ok: false, steps, message: err instanceof Error ? err.message : "Portal nicht erreichbar." }; }
    const applied = await ports.apply(answer); steps += 1;
    if (!applied.ok) return { ok: false, steps, message: applied.error ?? "Die Box hat die Antwort abgelehnt." };
    if (applied.done) return { ok: true, steps, message: "Alles übertragen." };
  }
  return { ok: false, steps, message: "Abgebrochen – zu viele Schritte." };
}
export function mainActionLabel(mode: CourierMode, waiting: number): string {
  if (mode === "kein_handy") return "Box verbinden";
  if (mode === "internet_bruecke") return waiting ? "Jetzt synchronisieren" : "Verbindung teilen";
  return waiting ? "Daten mitnehmen" : "Offline arbeiten";
}
