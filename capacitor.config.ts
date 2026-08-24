import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.schiessportal.mobile",
  appName: "Schiessportal",
  webDir: "mobile/dist",
  server: {
    androidScheme: "https",
    cleartext: false,
    allowNavigation: [
      "schiessportal.local",
      "schiessportal-box.local",
      "192.168.4.1",
      "schiessportal.com"
    ]
  }
};

export default config;
