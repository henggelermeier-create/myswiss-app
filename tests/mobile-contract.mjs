import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const capacitorConfig = read('capacitor.config.ts');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const networkSecurity = read('android/app/src/main/res/xml/network_security_config.xml');
const packageJson = JSON.parse(read('package.json'));

assert.match(capacitorConfig, /url:\s*['"]https:\/\/schiessportal\.com['"]/);
assert.match(capacitorConfig, /schiessportal\.local:8080/);
assert.match(networkSecurity, /<domain[^>]*>schiessportal\.local<\/domain>/);
assert.match(manifest, /android\.permission\.INTERNET/);
assert.match(manifest, /android\.permission\.CAMERA/);
assert.match(manifest, /android:scheme="schiessportal"/);
assert.match(manifest, /android:host="box"/);
assert.ok(packageJson.dependencies['@capacitor/barcode-scanner'], 'QR scanner plug-in missing');
assert.ok(
  packageJson.dependencies['@aparajita/capacitor-secure-storage'],
  'Secure Storage plug-in missing'
);

const forbiddenFileNames = /(?:device_secret|offline[-_]?codes?|transfer[-_]?keys?)/i;
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules', 'build'].includes(entry.name)) return [];
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

for (const file of walk(new URL('.', root).pathname)) {
  assert.ok(statSync(file).isFile());
  assert.doesNotMatch(file, forbiddenFileNames, `Sensitive file name found: ${file}`);
}

console.log('Mobile contract verified: QR, secure storage, network access and deep link.');
