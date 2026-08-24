import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { parseBoxPairingUrl } from "../lib/deep-link";

type ScanStatus =
  | "idle"
  | "vorbereiten"
  | "nicht_unterstuetzt"
  | "keine_berechtigung"
  | "scannt"
  | "fehler";

export type QrScanBoxProps = {
  onToken: (token: string) => void | Promise<void>;
};

async function loadScanner() {
  try {
    return await import("@capacitor-mlkit/barcode-scanning");
  } catch {
    return null;
  }
}

async function waitForGoogleScanner(
  scanner: Awaited<ReturnType<typeof loadScanner>> extends infer M
    ? M extends { BarcodeScanner: infer S }
      ? S
      : never
    : never,
) {
  if (Capacitor.getPlatform() !== "android") return true;
  const current = await scanner.isGoogleBarcodeScannerModuleAvailable();
  if (current.available) return true;

  await scanner.installGoogleBarcodeScannerModule();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const check = await scanner.isGoogleBarcodeScannerModuleAvailable();
    if (check.available) return true;
  }
  return false;
}

export function QrScanBox({ onToken }: QrScanBoxProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      void loadScanner().then((mod) => mod?.BarcodeScanner.stopScan().catch(() => undefined));
    };
  }, []);

  async function startScan() {
    setErrorMessage(null);
    const mod = await loadScanner();
    if (!mod) {
      setStatus("nicht_unterstuetzt");
      return;
    }

    const { BarcodeScanner, BarcodeFormat } = mod;
    try {
      const supported = await BarcodeScanner.isSupported();
      if (!supported.supported) {
        setStatus("nicht_unterstuetzt");
        return;
      }

      if (Capacitor.getPlatform() === "android") {
        setStatus("vorbereiten");
        const ready = await waitForGoogleScanner(BarcodeScanner);
        if (!ready) {
          setStatus("fehler");
          setErrorMessage(
            "Der Android-QR-Scanner konnte noch nicht geladen werden. Internet kurz aktivieren und nochmals «QR-Code scannen» drücken.",
          );
          return;
        }
      }

      setStatus("scannt");
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const raw = barcodes[0]?.rawValue ?? barcodes[0]?.displayValue ?? null;
      const link = parseBoxPairingUrl(raw);
      if (!link) {
        setStatus("fehler");
        setErrorMessage("Das ist kein Schiessportal-Box-QR-Code. Bitte den QR-Code aus dem Portal verwenden.");
        return;
      }

      await onToken(link.token);
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan fehlgeschlagen.";
      if (/permission|berechtigung/i.test(message)) setStatus("keine_berechtigung");
      else setStatus("fehler");
      setErrorMessage(message);
    }
  }

  async function openSettings() {
    const mod = await loadScanner();
    await mod?.BarcodeScanner.openSettings().catch(() => undefined);
  }

  return (
    <div className="panel flex w-full flex-col gap-3 p-4 text-left">
      {status === "vorbereiten" && (
        <p className="text-sm text-muted-foreground">QR-Scanner wird vorbereitet …</p>
      )}
      {status === "nicht_unterstuetzt" && (
        <p className="text-sm text-muted-foreground">
          Kamera-Scan ist auf diesem Gerät nicht verfügbar. Bitte den Kopplungscode unten eingeben.
        </p>
      )}
      {status === "keine_berechtigung" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">Keine Kamera-Berechtigung. Bitte in den App-Einstellungen erlauben.</p>
          <button type="button" className="btn-secondary" onClick={openSettings}>App-Einstellungen öffnen</button>
        </div>
      )}
      {status === "fehler" && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      <button
        type="button"
        className="btn-secondary"
        disabled={status === "scannt" || status === "vorbereiten"}
        onClick={startScan}
      >
        {status === "scannt" ? "Scanner läuft …" : status === "vorbereiten" ? "Scanner wird geladen …" : "QR-Code scannen"}
      </button>
    </div>
  );
}
