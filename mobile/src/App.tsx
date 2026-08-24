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
import {
  appSessionStore,
  boxPairingStore,
  lastReceiptStore,
  offlineSecretStore,
  pendingUpstreamStore,
} from "./lib/transfer-storage";
import { runCourier, type CourierPorts } from "./lib/courier";
import { isPortalReachable, receiveUpstreamPackage } from "./lib/portal-client";
import { openSystemWifiSettings, type Platform } from "./lib/wifi-settings";
import { APP_VERSION } from "./version";

function platform(): Platform {
  const anyWin = window as unknown as { Capacitor?: { getPlatform?: () => string } };
  const p = anyWin.Capacitor?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
}

export function App() {
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
    return () => {
      void netSub.then((h) => h.remove());
      void resumeSub.then((h) => h.remove());
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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Übertragung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function shareInternet() {
    if (!discovery) return;
    setBusy(true);
    setMessage(null);
    setBridgeStep(null);
    const client = new LocalBoxClient(discovery.baseUrl);
    try {
      await client.bridgeHello(true);
      const result = await runInternetBridge({
        prepare: () => client.relayPrepare(),
        send: async (url, bundle) => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(bundle),
          });
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
    } finally {
      setBridgeStep(null);
      setBusy(false);
    }
  }

  const { title, next } = describeBoxState(state);
  const compatible = isLocalApiCompatible(discovery?.discovery.local_api_version);

  async function handleMainAction() {
    setBusy(true);
    setMessage(null);
    try {
      if (state === "nicht_gefunden") {
        openSystemWifiSettings(platform());
        return;
      }
      if (state === "verbunden" || state === "offline_bereit") {
        const saved = await offlineSecretStore.load();
        if (saved && discovery) {
          const client = new LocalBoxClient(discovery.baseUrl);
          await client.login(saved.username, saved.code);
          setMessage("Offline-Zugang aktiv.");
        } else {
          setMessage("Bitte «verein» + Code eingeben, um offline zu arbeiten.");
        }
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
    } finally {
      setBusy(false);
    }
  }

  async function resetPairing() {
    setBusy(true);
    try {
      await Promise.all([appSessionStore.clear(), boxPairingStore.clear()]);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-5">
      <header className="flex items-center justify-between pt-2">
        <span className="eyebrow">Meine Box</span>
        <span className="eyebrow">v{APP_VERSION}</span>
      </header>

      <section className="panel flex flex-col gap-3 p-6 text-center">
        <h1 className="text-2xl">{title}</h1>
        <p className="text-muted-foreground">{next}</p>
        {!compatible && discovery && <p className="text-sm text-destructive">{LOCAL_API_INCOMPATIBLE_MESSAGE}</p>}
      </section>

      <button className="btn-primary" disabled={busy} onClick={handleMainAction}>
        {mainActionLabel(mode, waiting)}
      </button>

      {bridgeStep && <p className="text-center text-sm text-muted-foreground">{bridgeStep} …</p>}
      {message && <p className="panel p-4 text-sm">{message}</p>}

      {transfer.step !== "leer" && (
        <TransferCard
          state={transfer}
          discovery={discovery}
          setTransfer={setTransfer}
          setMessage={setMessage}
          onSend={() => void runCourierNow()}
        />
      )}

      <button className="text-left text-sm text-muted-foreground underline" onClick={() => setDetailsOpen((v) => !v)}>
        {detailsOpen ? "Details verbergen" : "Details anzeigen"}
      </button>

      {detailsOpen && (
        <div className="panel flex flex-col gap-4 p-4">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Box-Adresse</dt><dd>{discovery?.baseUrl ?? "—"}</dd>
            <dt className="text-muted-foreground">Box-Version</dt><dd>{discovery?.discovery.agent_version ?? "—"}</dd>
            <dt className="text-muted-foreground">local_api_version</dt><dd>{discovery?.discovery.local_api_version ?? "—"}</dd>
            <dt className="text-muted-foreground">App-Version</dt><dd>{APP_VERSION}</dd>
          </dl>
          <button className="btn-secondary" disabled={busy} onClick={() => void resetPairing()}>
            Box neu koppeln
          </button>
        </div>
      )}
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
        setTransfer(transferReducer(state, {
          type: "ABHOLEN_ERFOLGREICH",
          hits: discovery.discovery.pending.hits,
          operations: discovery.discovery.pending.operations,
        }));
      } catch (err) {
        setTransfer(transferReducer(state, { type: "ABHOLEN_FEHLGESCHLAGEN", message: String(err) }));
      }
    } else if (state.step === "bereit_zum_senden") {
      setMessage("Senden …");
      onSend();
    }
  }

  return (
    <section className="panel flex flex-col gap-3 p-5">
      <p className="font-semibold">{title}</p>
      {action && <button className="btn-secondary" onClick={onAction}>{action}</button>}
    </section>
  );
}
