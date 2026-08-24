import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const cap = read("capacitor.config.ts");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const network = read("android/app/src/main/res/xml/network_security_config.xml");
const pkg = JSON.parse(read("package.json"));
const app = read("mobile/src/App.tsx");
const pairingGate = read("mobile/src/PairingGate.tsx");
const brand = read("mobile/src/components/AppBrand.tsx");
const help = read("mobile/src/components/HelpLinks.tsx");
const scanner = read("mobile/src/components/QrScanBox.tsx");
const portal = read("mobile/src/lib/portal-client.ts");
const secure = read("mobile/src/lib/secure-store.ts");
const deep = read("mobile/src/lib/deep-link.ts");
const version = read("mobile/src/version.ts");
const workflow = read(".github/workflows/android-debug.yml");

assert.match(cap, /webDir:\s*["']mobile\/dist["']/);
assert.match(cap, /appId:\s*["']com\.schiessportal\.mobile\.v123["']/);
assert.match(cap, /appName:\s*["']Schiessportal 1\.2\.3["']/);
assert.doesNotMatch(cap, /server:\s*\{[^}]*url:/s, "App darf nicht nur eine Remote-Webseite laden");
assert.match(manifest, /android\.permission\.INTERNET/);
assert.match(manifest, /android\.permission\.CAMERA/);
assert.match(manifest, /android:scheme="schiessportal"/);
assert.match(manifest, /android:host="box"/);
assert.match(network, /schiessportal\.local/);

assert.ok(pkg.dependencies["@capacitor-mlkit/barcode-scanning"], "QR-Scanner fehlt");
assert.ok(pkg.dependencies["capacitor-secure-storage-plugin"], "Secure Storage fehlt");
assert.ok(pkg.dependencies["@capacitor/network"], "Network Plugin fehlt");
assert.ok(pkg.dependencies["@capacitor/preferences"], "Preferences Plugin fehlt");
assert.ok(pkg.dependencies["@capacitor/browser"], "Browser Plugin für Hilfe/Portal fehlt");
assert.equal(pkg.version, "1.2.3");
assert.match(version, /1\.2\.3/);

assert.match(portal, /https:\/\/schiessportal\.com/);
assert.match(portal, /isPortalReachable/);
assert.match(app, /discoverBox/);
assert.match(app, /runCourier/);
assert.match(app, /runInternetBridge/);
assert.match(app, /Box neu koppeln/);
assert.match(app, /AppBrand/);
assert.match(app, /HelpLinks/);
assert.match(secure, /SECURE_TIMEOUT_MS/);
assert.match(secure, /withTimeout/);
assert.match(secure, /capacitor-secure-storage-plugin/);
assert.match(deep.replaceAll("\\/", "/"), /schiessportal:\/\/box\//);

assert.match(pairingGate, /STARTUP_SAFETY_MS/);
assert.match(pairingGate, /setChecking\(false\)/);
assert.match(pairingGate, /redeemBoxQr/);
assert.match(pairingGate, /appSessionStore\.save/);
assert.match(pairingGate, /boxPairingStore\.save/);
assert.doesNotMatch(pairingGate, /token:\s*["']manuell["']/i, "Ungültige Fake-Kopplung darf nicht gespeichert werden");
assert.match(pairingGate, /Code prüfen und Box koppeln/);
assert.match(pairingGate, /AppBrand/);
assert.match(pairingGate, /HelpLinks/);

assert.match(brand, /Schiessportal/);
assert.match(brand, /SCHIESSPORTAL\.COM/);
assert.match(help, /https:\/\/schiessportal\.com/);
assert.match(help, /https:\/\/chatgpt\.com/);
assert.match(help, /KI-Hilfe öffnen/);
assert.match(help, /Browser\.open/);

assert.match(scanner, /isGoogleBarcodeScannerModuleAvailable/);
assert.match(scanner, /installGoogleBarcodeScannerModule/);
assert.match(scanner, /BarcodeScanner\.scan/);
assert.match(workflow, /com\.google\.mlkit\.vision\.DEPENDENCIES/);
assert.match(workflow, /barcode_ui/);
assert.match(workflow, /android-actions\/setup-android@v3/);
assert.match(workflow, /actions\/upload-artifact@v4/);
assert.match(workflow, /schiessportal-android-1\.2\.3/);
assert.match(workflow, /aapt.*dump badging/s);
assert.doesNotMatch(workflow, /storePassword|keyPassword|debugStable|debug-keystore/i, "Keine Signing-Schlüssel oder Passwörter im öffentlichen Workflow");

const forbidden = /(?:device_secret|offline[-_]?code(?:s)?|transfer[-_]?key(?:s)?)/i;
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "build", "dist"].includes(entry.name)) return [];
    const full = join(path, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(new URL(".", root).pathname)) {
  assert.doesNotMatch(file, forbidden, `Sensitive filename found: ${file}`);
}

console.log("Mobile contract verified: 1.2.3 startup, pairing, logo, website, AI help, QR scanner, secure storage and Android build checks.");
