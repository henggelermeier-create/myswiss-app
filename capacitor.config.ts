import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.schiessportal.mobile.v124",
  appName: "Schiessportal 1.2.4",
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
