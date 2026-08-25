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
const storage = read("mobile/src/lib/transfer-storage.ts");
const deep = read("mobile/src/lib/deep-link.ts");
const version = read("mobile/src/version.ts");
const debugWorkflow = read(".github/workflows/android-debug.yml");
const releaseWorkflow = read(".github/workflows/android-release.yml");
const releaseScript = read("scripts/configure-android-release.mjs");

assert.match(cap, /webDir:\s*["']mobile\/dist["']/);
assert.match(cap, /com\.schiessportal\.mobile/);
assert.match(cap, /SCHIESSPORTAL_APP_ID/);
assert.match(cap, /SCHIESSPORTAL_APP_NAME/);
assert.match(cap, /\|\|\s*["']Schiessportal["']/);
assert.match(cap, /CapacitorHttp/);
assert.match(cap, /enabled:\s*true/);
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
assert.equal(pkg.version, "1.2.5");
assert.match(version, /1\.2\.5/);

assert.match(portal, /https:\/\/schiessportal\.com/);
assert.match(portal, /CapacitorHttp\.request/);
assert.match(portal, /Capacitor\.isNativePlatform/);
assert.match(portal, /connectTimeout/);
assert.match(portal, /redeemBoxQr/);
assert.match(portal, /isPortalReachable/);
assert.match(portal, /Schiessportal konnte nicht erreicht werden/);

assert.match(app, /discoverBox/);
assert.match(app, /runCourier/);
assert.match(app, /runInternetBridge/);
assert.match(app, /Box neu koppeln/);
assert.match(app, /AppBrand/);
assert.match(app, /HelpLinks/);
assert.match(secure, /SECURE_TIMEOUT_MS/);
assert.match(secure, /withTimeout/);
assert.match(secure, /capacitor-secure-storage-plugin/);
assert.match(storage, /PREFERENCES_TIMEOUT_MS/);
assert.match(storage, /withPreferencesTimeout/);
assert.match(storage, /Preferences\.get/);
assert.match(storage, /Preferences\.set/);
assert.match(deep.replaceAll("\\/", "/"), /schiessportal:\/\/box\//);

assert.match(pairingGate, /STARTUP_SAFETY_MS/);
assert.match(pairingGate, /setChecking\(false\)/);
assert.match(pairingGate, /redeemBoxQr/);
assert.match(pairingGate, /appSessionStore\.save/);
assert.match(pairingGate, /setPaired\(true\)/);
assert.match(pairingGate, /void boxPairingStore/);
assert.match(pairingGate, /\.catch\(\(\) => undefined\)/);
assert.doesNotMatch(pairingGate, /await\s+boxPairingStore\.save/, "Zusatzdaten dürfen erfolgreiche Kopplung nicht blockieren");
assert.doesNotMatch(pairingGate, /token:\s*["']manuell["']/i, "Ungültige Fake-Kopplung darf nicht gespeichert werden");
assert.match(pairingGate, /Code prüfen und Box koppeln/);
assert.match(pairingGate, /AppBrand/);
assert.match(pairingGate, /HelpLinks/);

assert.match(brand, /Die Schweizer Plattform für Schützenvereine/);
assert.match(brand, /schiessportal\.com/);
assert.match(brand, /M32 4a28 28 0 0 1 0 56/);
assert.match(brand, /SCHIESS/);
assert.match(brand, /PORTAL/);

assert.match(help, /https:\/\/schiessportal\.com\/\?hilfe=ki&quelle=app/);
assert.match(help, /https:\/\/schiessportal\.com\/kontakt\?quelle=app/);
assert.match(help, /KI-Hilfe/);
assert.match(help, /Hilfe &amp; Kontakt/);
assert.match(help, /Browser\.open/);
assert.doesNotMatch(help, /chatgpt\.com/i, "KI-Hilfe muss über schiessportal.com laufen");

assert.match(scanner, /isGoogleBarcodeScannerModuleAvailable/);
assert.match(scanner, /installGoogleBarcodeScannerModule/);
assert.match(scanner, /BarcodeScanner\.scan/);

assert.match(debugWorkflow, /SCHIESSPORTAL_APP_ID:\s*com\.schiessportal\.mobile\.v125/);
assert.match(debugWorkflow, /SCHIESSPORTAL_APP_NAME:\s*Schiessportal 1\.2\.5/);
assert.match(debugWorkflow, /com\.google\.mlkit\.vision\.DEPENDENCIES/);
assert.match(debugWorkflow, /barcode_ui/);
assert.match(debugWorkflow, /android-actions\/setup-android@v3/);
assert.match(debugWorkflow, /actions\/upload-artifact@v4/);
assert.match(debugWorkflow, /schiessportal-android-1\.2\.5/);
assert.match(debugWorkflow, /com\.schiessportal\.mobile\.v125/);
assert.match(debugWorkflow, /versionName='1\.2\.5'/);
assert.match(debugWorkflow, /schiessportal_logo_foreground\.xml/);
assert.match(debugWorkflow, /aapt.*dump badging/s);
assert.doesNotMatch(debugWorkflow, /storePassword|keyPassword|debugStable|debug-keystore/i, "Keine Signing-Schlüssel oder Passwörter im Debug-Workflow");

assert.match(releaseWorkflow, /Android Release AAB/);
assert.match(releaseWorkflow, /bundleRelease/);
assert.match(releaseWorkflow, /schiessportal-play-release-1\.2\.5/);
assert.match(releaseWorkflow, /schiessportal-release-UNSIGNED-1\.2\.5/);
assert.match(releaseWorkflow, /ANDROID_KEYSTORE_BASE64/);
assert.match(releaseWorkflow, /ANDROID_KEYSTORE_PASSWORD/);
assert.match(releaseWorkflow, /ANDROID_KEY_ALIAS/);
assert.match(releaseWorkflow, /ANDROID_KEY_PASSWORD/);
assert.match(releaseWorkflow, /jarsigner -verify -strict/);
assert.match(releaseWorkflow, /sha256sum/);
assert.doesNotMatch(releaseWorkflow, /com\.schiessportal\.mobile\.v125/);
assert.doesNotMatch(releaseWorkflow, /usesCleartextTraffic=\"true\"/);

assert.match(releaseScript, /VERSION_NAME = "1\.2\.5"/);
assert.match(releaseScript, /VERSION_CODE = 10205/);
assert.match(releaseScript, /usesCleartextTraffic=\"false\"/);
assert.match(releaseScript, /networkSecurityConfig/);
assert.match(releaseScript, /schiessportal-box\.local/);
assert.match(releaseScript, /192\.168\.4\.1/);
assert.match(releaseScript, /signingConfigs/);
assert.match(releaseScript, /System\.getenv\("ANDROID_KEYSTORE_PASSWORD"\)/);
assert.doesNotMatch(releaseScript, /storePassword\s+["'][^"']+["']/, "Kein fest codiertes Signierpasswort");

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

console.log("Mobile contract verified: 1.2.5 production identity, Play AAB pipeline, non-blocking pairing, native portal bridge, Schiessportal help/branding and safe release signing contract.");
