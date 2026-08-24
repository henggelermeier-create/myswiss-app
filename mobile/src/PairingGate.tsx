import { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { App } from "./App";
import { AppBrand } from "./components/AppBrand";
import { HelpLinks } from "./components/HelpLinks";
import { QrScanBox } from "./components/QrScanBox";
import { parseBoxPairingUrl } from "./lib/deep-link";
import { redeemBoxQr } from "./lib/portal-client";
import { appSessionStore, boxPairingStore } from "./lib/transfer-storage";
import { APP_VERSION } from "./version";

const STARTUP_SAFETY_MS = 2200;

function extractToken(input: string): string {
  const value = input.trim();
  if (!value) return "";
  return parseBoxPairingUrl(value)?.token ?? value;
}

function sessionIsValid(session: { token: string; expires_at: string } | null): boolean {
  if (!session?.token) return false;
  const expires = Date.parse(session.expires_at);
  return Number.isFinite(expires) && expires > Date.now() + 60_000;
}

function launchUrlWithTimeout() {
  return Promise.race([
    CapApp.getLaunchUrl().catch(() => undefined),
    new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 900)),
  ]);
}

export function PairingGate() {
  const [checking, setChecking] = useState(true);
  const [paired, setPaired] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pair(raw: string) {
    const token = extractToken(raw);
    if (!token) {
      setError("Bitte zuerst den QR-Code scannen oder den Kopplungscode eingeben.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const session = await redeemBoxQr(token);
      if (!session.token || !session.expires_at) throw new Error("Das Portal hat keine gültige App-Sitzung geliefert.");
      await appSessionStore.save({ token: session.token, expires_at: session.expires_at });
      await boxPairingStore.save({ token, box_id: session.device_id, club_id: null });
      setPaired(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Box konnte nicht gekoppelt werden.");
    } finally {
      setBusy(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    let active = true;
    let urlHandle: { remove: () => Promise<void> } | null = null;

    const safety = window.setTimeout(() => {
      if (!active) return;
      setChecking(false);
      setError((current) => current ?? "Startprüfung wurde übersprungen. Die App ist bereit zum Koppeln.");
    }, STARTUP_SAFETY_MS);

    void (async () => {
      try {
        const session = await appSessionStore.load();
        if (!active) return;
        if (sessionIsValid(session)) {
          setPaired(true);
        } else {
          await Promise.allSettled([appSessionStore.clear(), boxPairingStore.clear()]);
        }

        const launch = await launchUrlWithTimeout();
        if (active && launch?.url) {
          const link = parseBoxPairingUrl(launch.url);
          if (link) await pair(link.token);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Startprüfung konnte nicht abgeschlossen werden.");
      } finally {
        window.clearTimeout(safety);
        if (active) setChecking(false);
      }
    })();

    void CapApp.addListener("appUrlOpen", ({ url }) => {
      const link = parseBoxPairingUrl(url);
      if (link) void pair(link.token);
    }).then((handle) => { urlHandle = handle; });

    return () => {
      active = false;
      window.clearTimeout(safety);
      void urlHandle?.remove();
    };
  }, []);

  if (checking) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <AppBrand />
        <div className="panel w-full p-5">
          <p className="font-semibold">App wird vorbereitet …</p>
          <p className="mt-1 text-sm text-muted-foreground">Maximal wenige Sekunden, danach erscheint die Kopplung.</p>
        </div>
      </main>
    );
  }

  if (paired) return <App />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 p-5">
      <header className="flex flex-col items-center gap-4 pt-3 text-center">
        <AppBrand />
        <div>
          <span className="eyebrow">Android App · v{APP_VERSION}</span>
          <h1 className="mt-3 text-2xl">Box koppeln</h1>
          <p className="mt-2 text-muted-foreground">
            Im Portal bei deiner Box «QR neu ausstellen» drücken und den angezeigten QR-Code hier scannen.
          </p>
        </div>
      </header>

      <QrScanBox onToken={pair} />

      <section className="panel flex flex-col gap-3 p-4">
        <div>
          <p className="font-medium">Kopplungscode manuell eingeben</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Du kannst auch den vollständigen Link schiessportal://box/… einfügen. Das ist nicht der Offline-Code «verein».
          </p>
        </div>
        <input
          className="panel px-3 py-2"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Kopplungscode oder schiessportal://box/…"
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
        />
        <button className="btn-primary" disabled={busy || !manualCode.trim()} onClick={() => void pair(manualCode)}>
          {busy ? "Box wird gekoppelt …" : "Code prüfen und Box koppeln"}
        </button>
      </section>

      {error && <p className="panel p-4 text-sm text-destructive">{error}</p>}
      <HelpLinks />
    </main>
  );
}
