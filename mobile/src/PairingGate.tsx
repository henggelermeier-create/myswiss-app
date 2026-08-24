import { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { App } from "./App";
import { QrScanBox } from "./components/QrScanBox";
import { parseBoxPairingUrl } from "./lib/deep-link";
import { redeemBoxQr } from "./lib/portal-client";
import { appSessionStore, boxPairingStore } from "./lib/transfer-storage";

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

export function PairingGate() {
  const [checking, setChecking] = useState(true);
  const [paired, setPaired] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function pair(raw: string) {
    const token = extractToken(raw);
    if (!token) {
      setError("Bitte zuerst den QR-Code scannen oder den Kopplungscode eingeben.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const session = await redeemBoxQr(token);
      if (!session.token || !session.expires_at) throw new Error("Das Portal hat keine gültige App-Sitzung geliefert.");
      await appSessionStore.save({ token: session.token, expires_at: session.expires_at });
      await boxPairingStore.save({ token, box_id: session.device_id, club_id: null });
      setSuccess(`Box gekoppelt${session.club_name ? ` – ${session.club_name}` : ""}.`);
      setPaired(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Box konnte nicht gekoppelt werden.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    let urlHandle: { remove: () => Promise<void> } | null = null;

    void (async () => {
      const session = await appSessionStore.load();
      if (!active) return;
      if (sessionIsValid(session)) {
        setPaired(true);
      } else {
        await appSessionStore.clear();
        await boxPairingStore.clear();
      }

      const launch = await CapApp.getLaunchUrl().catch(() => undefined);
      if (active && launch?.url) {
        const link = parseBoxPairingUrl(launch.url);
        if (link) await pair(link.token);
      }
      if (active) setChecking(false);
    })();

    void CapApp.addListener("appUrlOpen", ({ url }) => {
      const link = parseBoxPairingUrl(url);
      if (link) void pair(link.token);
    }).then((handle) => { urlHandle = handle; });

    return () => {
      active = false;
      void urlHandle?.remove();
    };
  }, []);

  if (checking) {
    return <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6"><p>App wird vorbereitet …</p></main>;
  }

  if (paired) return <App />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="pt-4 text-center">
        <span className="eyebrow">Schiessportal App</span>
        <h1 className="mt-3 text-2xl">Box koppeln</h1>
        <p className="mt-2 text-muted-foreground">
          Im Portal bei deiner Box «QR neu ausstellen» drücken und den angezeigten QR-Code hier scannen.
        </p>
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
      {success && <p className="panel p-4 text-sm">{success}</p>}
    </main>
  );
}
