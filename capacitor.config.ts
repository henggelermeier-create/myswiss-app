import type { CapacitorConfig } from "@capacitor/cli";

const appId = process.env.SCHIESSPORTAL_APP_ID?.trim() || "com.schiessportal.mobile";
const appName = process.env.SCHIESSPORTAL_APP_NAME?.trim() || "Schiessportal";

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: "mobile/dist",
  server: {
    androidScheme: "https",
    cleartext: false,
    allowNavigation: [
      "schiessportal.local",
      "schiessportal-box.local",
      "192.168.4.1",
      "schiessportal.com",
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
