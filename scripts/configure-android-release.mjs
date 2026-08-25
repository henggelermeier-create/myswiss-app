import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const VERSION_NAME = "1.2.5";
const VERSION_CODE = 10205;

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = read(manifestPath);

if (!manifest.includes("android.permission.CAMERA")) {
  manifest = manifest.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />',
  );
}

const appTagMatch = manifest.match(/<application\b[^>]*>/);
if (!appTagMatch) throw new Error("<application> fehlt im AndroidManifest");
let appTag = appTagMatch[0];
if (/android:usesCleartextTraffic="[^"]*"/.test(appTag)) {
  appTag = appTag.replace(/android:usesCleartextTraffic="[^"]*"/, 'android:usesCleartextTraffic="false"');
} else {
  appTag = appTag.slice(0, -1) + ' android:usesCleartextTraffic="false">';
}
if (/android:networkSecurityConfig="[^"]*"/.test(appTag)) {
  appTag = appTag.replace(
    /android:networkSecurityConfig="[^"]*"/,
    'android:networkSecurityConfig="@xml/network_security_config"',
  );
} else {
  appTag = appTag.slice(0, -1) + ' android:networkSecurityConfig="@xml/network_security_config">';
}
manifest = manifest.replace(appTagMatch[0], appTag);

if (!manifest.includes("com.google.mlkit.vision.DEPENDENCIES")) {
  const refreshedAppTag = manifest.match(/<application\b[^>]*>/)?.[0];
  if (!refreshedAppTag) throw new Error("<application> fehlt nach Konfiguration");
  manifest = manifest.replace(
    refreshedAppTag,
    `${refreshedAppTag}\n        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui" />`,
  );
}

if (!manifest.includes('android:scheme="schiessportal"')) {
  const deepLinks = [
    "                <intent-filter>",
    '                    <action android:name="android.intent.action.VIEW" />',
    '                    <category android:name="android.intent.category.DEFAULT" />',
    '                    <category android:name="android.intent.category.BROWSABLE" />',
    '                    <data android:scheme="schiessportal" android:host="box" android:pathPrefix="/" />',
    "                </intent-filter>",
    '                <intent-filter android:autoVerify="true">',
    '                    <action android:name="android.intent.action.VIEW" />',
    '                    <category android:name="android.intent.category.DEFAULT" />',
    '                    <category android:name="android.intent.category.BROWSABLE" />',
    '                    <data android:scheme="https" android:host="schiessportal.com" android:pathPrefix="/app/box/" />',
    "                </intent-filter>",
  ].join("\n");
  manifest = manifest.replace("</activity>", `${deepLinks}\n        </activity>`);
}

write(manifestPath, manifest);

write(
  "android/app/src/main/res/xml/network_security_config.xml",
  `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">schiessportal.local</domain>
        <domain includeSubdomains="false">schiessportal-box.local</domain>
        <domain includeSubdomains="false">192.168.4.1</domain>
    </domain-config>
</network-security-config>
`,
);

const gradlePath = "android/app/build.gradle";
let gradle = read(gradlePath)
  .replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${VERSION_NAME}"`);

const signingReady = [
  "ANDROID_KEYSTORE_FILE",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
].every((name) => Boolean(process.env[name]?.trim()));

if (signingReady && !gradle.includes("signingConfigs {")) {
  const signingBlock = `    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_FILE"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`;
  gradle = gradle.replace("    buildTypes {", `${signingBlock}    buildTypes {`);
  gradle = gradle.replace(
    /release\s*\{\n/,
    "release {\n            signingConfig signingConfigs.release\n",
  );
}
write(gradlePath, gradle);

const foreground = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="64" android:viewportHeight="64">
  <path android:pathData="M32,4a28,28 0,0 1,0 56" android:fillColor="@android:color/transparent" android:strokeColor="#1F2937" android:strokeWidth="2.4" android:strokeLineCap="round" />
  <path android:pathData="M32,4a28,28 0,0 0,0 56" android:fillColor="@android:color/transparent" android:strokeColor="#1F2937" android:strokeWidth="2.4" android:strokeLineCap="round" />
  <path android:pathData="M32,13a19,19 0,0 1,15.5 30" android:fillColor="@android:color/transparent" android:strokeColor="#1F2937" android:strokeWidth="2.4" android:strokeLineCap="round" />
  <path android:pathData="M32,51a19,19 0,0 1,-15.5 -8" android:fillColor="@android:color/transparent" android:strokeColor="#1F2937" android:strokeWidth="2.4" android:strokeLineCap="round" />
  <path android:pathData="M24,32H6M24,32l-6,-6H8" android:fillColor="@android:color/transparent" android:strokeColor="#1F2937" android:strokeWidth="2.4" android:strokeLineCap="round" android:strokeLineJoin="round" />
  <path android:pathData="M40,32h18M40,32l6,6h10" android:fillColor="@android:color/transparent" android:strokeColor="#DC2626" android:strokeWidth="2.4" android:strokeLineCap="round" android:strokeLineJoin="round" />
  <path android:pathData="M32,26a6,6 0,1 0,0 12a6,6 0,1 0,0 -12" android:fillColor="#DC2626" />
</vector>
`;
write("android/app/src/main/res/drawable/schiessportal_logo_foreground.xml", foreground);

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@android:color/white" />
  <foreground android:drawable="@drawable/schiessportal_logo_foreground" />
</adaptive-icon>
`;
write("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml", adaptive);
write("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml", adaptive);

console.log(
  `Android release configured: ${VERSION_NAME} (${VERSION_CODE}), signing=${signingReady ? "enabled" : "unsigned verification"}`,
);
