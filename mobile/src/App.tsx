import { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import {
  boxStateFrom,
  describeBoxState,
  discoverBox,
  isLocalApiCompatible,
  LOCAL_API_INCOMPATIBLE_MESSAGE,
  LocalBoxClient,
  type BoxDiscovery,
} from "@/lib/local-api";
import { transferReducer, describeTransferState, initialTransferState } from "./lib/transfer-flow";
import { courierMode, mainActionLabel, runInternetBridge } from "./lib/bridge-courier";
import { parseBoxPairingUrl } from "./lib/deep-link";
import {
  appSessionStore,
  boxPairingStore,
  lastReceiptStore,
  offlineSecretStore,
  pendingUpstreamStore,
} from "./lib/transfer-storage";
import { runCourier, type CourierPorts } from "./lib/courier";
import { isPortalReachable, receiveUpstreamPackage, redeemBoxQr } from "./lib/portal-client";
import { openSystemWifiSettings, type Platform } from "./lib/wifi-settings";
import { QrScanBox } from "./components/QrScanBox";
import { APP_VERSION } from "./version";

async function clearPairing() {
  await Promise.all([boxPairingStore.clear(), appSessionStore.clear()]);
}

function pairingTokenFromInput(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("Bitte QR-Code scannen oder Kopplungscode eingeben.");
  return parseBoxPairingUrl(value)?.token ?? value;
}

async function redeemAndPersistPairing(input: string) {
  const token = pairingTokenFromInput(input);
  const session = await redeemBoxQr(token);
  if (!session.token || !session.expires_at) throw new Error("Portal hat keine gültige App-Sitzung geliefert.");
  await appSessionStore.save({ token: session.token, expires_at: session.expires_at });
  await boxPairingStore.save({ token, box_id: session.device_id, club_id: null });
  return session;
}

function useOnboardingDone() {
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    void (async () => {
      const [pairing, session] = await Promise.all([boxPairingStore.load(), appSessionStore.load()]);
      const expires = session?.expires_at ? Date.parse(session.expires_at) : 0;
      const valid = Boolean(pairing && session && Number.isFinite(expires) && expires > Date.now());
      if (!valid) await clearPairing();
      setDone(valid);
    })();
  }, []);
  return done;
}

function platform(): Platform {
  const anyWin = window as unknown as { Capacitor?: { getPlatform?: () => string } };
  const p = anyWin.Capacitor?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
}

export function App() {
  const onboardingDone = useOnboardingDone();
  const [discovery, setDiscovery] = useState<{ baseUrl: string; discovery: BoxDiscovery } | null>(null);
  const [online, setOnline] = useState(true);
  const [portalOk, setPortalOk] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transfer, setTransfer] = useState(initialTransferState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bridgeStep, setBridgeStep] = useState<string | null>(null);

  async function redetect() {
    const found = await discoverBox();
    setDiscovery(found);
    if (found) {
      setTransfer(transferReducer(initialTransferState, {
        type: "PENDING_ERKANNT",
        hits: found.discovery.pending.hits,
        operations: found.discovery.pending.operations,
      }));
    }
  }

  async function refreshPortal(connected: boolean) {
    setOnline(connected);
    setPortalOk(connected ? await isPortalReachable() : false);
  }

  useEffect(() => {
    void redetect();
    Network.getStatus().then((s) => void refreshPortal(s.connected));
    const netSub = Network.addListener("networkStatusChange", (s) => void refreshPortal(s.connected));
    const resumeSub = CapApp.addListener("resume", () => void redetect());
    const urlSub = CapApp.addListener("appUrlOpen", (e) => {
      const link = parseBoxPairingUrl(e.url);
      if (!link) return;
      void redeemAndPersistPairing(link.token)
        .then(() => window.location.reload())
        .catch((err) => setMessage(err instanceof Error ? err.message : "Kopplung fehlgeschlagen."));
    });
    void CapApp.getLaunchUrl().then((launch) => {
      const link = parseBoxPairingUrl(launch?.url);
      if (!link) return;
      void redeemAndPersistPairing(link.token)
        .then(() => window.location.reload())
        .catch((err) => setMessage(err instanceof Error ? err.message : "Kopplung fehlgeschlagen."));
    });
    return () => {
      void netSub.then((h) => h.remove());
      void resumeSub.then((h) => h.remove());
      void urlSub.then((h) => h.remove());
    };
  }, []);

  const state = boxStateFrom(discovery?.discovery ?? null, portalOk);
  const mode = courierMode(Boolean(discovery), portalOk);
  const waiting = discovery ? discovery.discovery.pending.hits + discovery.discovery.pending.operations : 0;

  function courierPorts(): CourierPorts {
    const client = discovery ? new LocalBoxClient(discovery.baseUrl) : null;
    return {
      exportFromBox: async () => {
        if (!client) throw new Error("Box nicht erreichbar.");
        return client.exportPackage();
      },
      loadPending: () => pendingUpstreamStore.load(),
      savePending: (pkg) => pendingUpstreamStore.save(pkg),
      clearPending: () => pendingUpstreamStore.clear(),
      upload: async (pkg) => {
        const session = await appSessionStore.load();
        if (!session) throw new Error("Nicht mit dem Portal gekoppelt – Box neu koppeln.");
        const res = await receiveUpstreamPackage(session.token, pkg);
        return res.receipt;
      },
      saveReceipt: (r) => lastReceiptStore.save(r),
      loadReceipt: () => lastReceiptStore.load(),
      clearReceipt: () => lastReceiptStore.clear(),
      deliverReceipt: async (r) => {
        if (!client) throw new Error("Box nicht erreichbar.");
        return client.receipts(r);
      },
    };
  }

  async function runCourierNow() {
    setBusy(true);
    setMessage(null);
    try {
      const reachable = online ? await isPortalReachable() : false;
      setPortalOk(reachable);
      const result = await runCourier(courierPorts(), { boxReachable: Boolean(discovery), online: reachable });
      setMessage(result.message);
      await redetect();
    } finally { setBusy(false); }
  }

  async function shareInternet() {
    if (!discovery) return;
    setBusy(true); setMessage(null); setBridgeStep(null);
    const client = new LocalBoxClient(discovery.baseUrl);
    try {
      await client.bridgeHello(true);
      const result = await runInternetBridge({
        prepare: () => client.relayPrepare(),
        send: async (url, bundle) => {
          const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bundle) });
          if (!res.ok) throw new Error(`Portal antwortet nicht (${res.status}).`);
          return res.json();
        },
        apply: (answer) => client.relayApply(answer),
        onStep: (label) => setBridgeStep(label),
      });
      setMessage(result.message);
      await redetect();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Übertragung abgebrochen.");
    } finally { setBridgeStep(null); setBusy(false); }
  }

  const { title, next } = describeBoxState(state);
  const compatible = isLocalApiCompatible(discovery?.discovery.local_api_version);

  async function handleMainAction() {
    setBusy(true); setMessage(null);
    try {
      if (state === "nicht_gefunden") { openSystemWifiSettings(platform()); return; }
      if (state === "verbunden" || state === "offline_bereit") {
        const saved = await offlineSecretStore.load();
        if (saved && discovery) {
          const client = new LocalBoxClient(discovery.baseUrl);
          await client.login(saved.username, saved.code);
          setMessage("Offline-Zugang aktiv.");
        } else setMessage("Bitte «verein» + Code eingeben, um offline zu arbeiten.");
        return;
      }
      if (mode === "internet_bruecke" && discovery) {
        await shareInternet();
        await runCourierNow();
        return;
      }
      await runCourierNow();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally { setBusy(false); }
  }

  async function resetPairing() {
    setBusy(true);
    try {
      await clearPairing();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  if (onboardingDone === null) {
    return <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6"><p>App wird vorbereitet …</p></main>;
  }

  if (onboardingDone === false) {
    return <Onboarding onDone={() => window.location.reload()} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-5">
      <header className="flex items-center justify-between pt-2"><span className="eyebrow">Meine Box</span><span className="eyebrow">v{APP_VERSION}</span></header>
      <section className="panel flex flex-col gap-3 p-6 text-center">
        <h1 className="text-2xl">{title}</h1><p className="text-muted-foreground">{next}</p>
        {!compatible && discovery && <p className="text-sm text-destructive">{LOCAL_API_INCOMPATIBLE_MESSAGE}</p>}
      </section>
      <button className="btn-primary" disabled={busy} onClick={handleMainAction}>{mainActionLabel(mode, waiting)}</button>
      {bridgeStep && <p className="text-center text-sm text-muted-foreground">{bridgeStep} …</p>}
      {message && <p className="panel p-4 text-sm">{message}</p>}
      {transfer.step !== "leer" && <TransferCard state={transfer} discovery={discovery} setTransfer={setTransfer} setMessage={setMessage} onSend={() => void runCourierNow()} />}
      <button className="text-left text-sm text-muted-foreground underline" onClick={() => setDetailsOpen((v) => !v)}>{detailsOpen ? "Details verbergen" : "Details anzeigen"}</button>
      {detailsOpen && <div className="panel flex flex-col gap-4 p-4">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Box-Adresse</dt><dd>{discovery?.baseUrl ?? "—"}</dd>
          <dt className="text-muted-foreground">Box-Version</dt><dd>{discovery?.discovery.agent_version ?? "—"}</dd>
          <dt className="text-muted-foreground">local_api_version</dt><dd>{discovery?.discovery.local_api_version ?? "—"}</dd>
          <dt className="text-muted-foreground">App-Version</dt><dd>{APP_VERSION}</dd>
        </dl>
        <button className="btn-secondary" disabled={busy} onClick={() => void resetPairing()}>Box neu koppeln</button>
      </div>}
    </main>
  );
}

function TransferCard({ state, discovery, setTransfer, setMessage, onSend }: {
  state: ReturnType<typeof transferReducer>;
  discovery: { baseUrl: string; discovery: BoxDiscovery } | null;
  setTransfer: (s: ReturnType<typeof transferReducer>) => void;
  setMessage: (m: string) => void;
  onSend: () => void;
}) {
  const { title, action } = describeTransferState(state);
  async function onAction() {
    if (state.step === "abholbar" && discovery) {
      setTransfer(transferReducer(state, { type: "ABHOLEN_GESTARTET" }));
      try {
        const client = new LocalBoxClient(discovery.baseUrl);
        const pkg = await client.exportPackage();
        await pendingUpstreamStore.save(pkg);
        setTransfer(transferReducer(state, { type: "ABHOLEN_ERFOLGREICH", hits: discovery.discovery.pending.hits, operations: discovery.discovery.pending.operations }));
      } catch (e) {
        setTransfer(transferReducer(state, { type: "ABHOLEN_FEHLGESCHLAGEN", message: String(e) }));
      }
    } else if (state.step === "bereit_zum_senden") { setMessage("Senden …"); onSend(); }
  }
  return <section className="panel flex flex-col gap-3 p-5"><p className="font-semibold">{title}</p>{action && <button className="btn-secondary" onClick={onAction}>{action}</button>}</section>;
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [manualCode, setManualCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  const steps = [
    { title: "Box koppeln", text: "QR-Code aus dem Portal scannen oder den Kopplungscode direkt eingeben. Die App prüft den Code sofort." },
    { title: "Box verbinden", text: "Im Schützenhaus verbindet sich das Handy mit der Box. Falls nötig öffnet «Box verbinden» die WLAN-Einstellungen." },
    { title: "Offline-Zugang verwenden", text: "Zum Arbeiten an der Box verwenden Sie zusätzlich Benutzername «verein» und den separaten Offline-Code aus dem Portal." },
    { title: "Fertig", text: "Die App ist gekoppelt. Sie können Daten zwischen Box und Portal übertragen." },
  ];
  const current = steps[step]!;

  async function pairNow(input: string) {
    setSaving(true);
    setPairError(null);
    try {
      await redeemAndPersistPairing(input);
      setStep(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kopplung fehlgeschlagen.";
      setPairError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between gap-6 p-6">
    <div />
    <section className="flex flex-col items-center gap-4 text-center">
      <span className="eyebrow">Schritt {step + 1} von {steps.length}</span>
      <h1 className="text-2xl">{current.title}</h1>
      <p className="text-muted-foreground">{current.text}</p>
      {step === 0 && <div className="flex w-full flex-col gap-3">
        <QrScanBox onToken={pairNow} />
        <div className="panel flex w-full flex-col gap-3 p-4 text-left">
          <p className="text-sm text-muted-foreground">Ohne Kamera: Kopplungscode oder vollständigen Schiessportal-Link eingeben.</p>
          <input
            className="panel px-3 py-2"
            placeholder="Kopplungscode"
            autoCapitalize="none"
            autoCorrect="off"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={saving || !manualCode.trim()}
            onClick={() => void pairNow(manualCode).catch(() => undefined)}
          >
            {saving ? "Code wird geprüft …" : "Code prüfen & koppeln"}
          </button>
          {pairError && <p className="text-sm text-destructive">{pairError}</p>}
        </div>
      </div>}
    </section>
    {step > 0 && <button className="btn-primary" disabled={saving} onClick={() => {
      if (step < steps.length - 1) setStep(step + 1);
      else onDone();
    }}>{step < steps.length - 1 ? "Weiter" : "Los geht's"}</button>}
  </main>;
}
