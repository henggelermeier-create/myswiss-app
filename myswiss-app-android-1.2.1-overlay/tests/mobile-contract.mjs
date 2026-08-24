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
const portal = read("mobile/src/lib/portal-client.ts");
const secure = read("mobile/src/lib/secure-store.ts");
const deep = read("mobile/src/lib/deep-link.ts");

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
assert.match(deep, /schiessportal:\/\/box\//);

const forbidden = /(?:device_secret|offline[-_]?code(?:s)?|transfer[-_]?key(?:s)?)/i;
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "build", "dist"].includes(entry.name)) return [];
    const full = join(path, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(new URL(".", root).pathname)) {
  // Source may mention the forbidden concepts in comments/tests, but filenames must never contain them.
  assert.doesNotMatch(file, forbidden, `Sensitive filename found: ${file}`);
}

console.log("Mobile contract verified: real app, QR, secure storage, local box, portal reachability and deep link.");
