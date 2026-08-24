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
const scanner = read("mobile/src/components/QrScanBox.tsx");
const portal = read("mobile/src/lib/portal-client.ts");
const secure = read("mobile/src/lib/secure-store.ts");
const deep = read("mobile/src/lib/deep-link.ts");
const workflow = read(".github/workflows/android-debug.yml");

assert.match(cap, /webDir:\s*["']mobile\/dist["']/);
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

assert.match(portal, /https:\/\/schiessportal\.com/);
assert.match(portal, /isPortalReachable/);
assert.match(app, /discoverBox/);
assert.match(app, /runCourier/);
assert.match(app, /runInternetBridge/);
assert.match(secure, /sessionStorage/);
assert.match(secure, /capacitor-secure-storage-plugin/);
assert.match(deep.replaceAll("\\/", "/"), /schiessportal:\/\/box\//);

assert.match(pairingGate, /redeemBoxQr/);
assert.match(pairingGate, /appSessionStore\.save/);
assert.match(pairingGate, /boxPairingStore\.save/);
assert.doesNotMatch(pairingGate, /token:\s*["']manuell["']/i, "Ungültige Fake-Kopplung darf nicht gespeichert werden");
assert.match(pairingGate, /Code prüfen und Box koppeln/);
assert.match(scanner, /isGoogleBarcodeScannerModuleAvailable/);
assert.match(scanner, /installGoogleBarcodeScannerModule/);
assert.match(scanner, /BarcodeScanner\.scan/);
assert.match(workflow, /com\.google\.mlkit\.vision\.DEPENDENCIES/);
assert.match(workflow, /barcode_ui/);
assert.match(workflow, /android-actions\/setup-android@v4/);
assert.match(workflow, /actions\/upload-artifact@v6/);

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

console.log("Mobile contract verified: pairing, QR scanner, secure storage, local box, portal reachability and deep links.");
