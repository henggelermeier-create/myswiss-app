import type { CapacitorConfig } from "@capacitor/cli";
const LOCAL_BOX_HOSTS = ["schiessportal.local", "schiessportal-box.local", "192.168.4.1"];
const config: CapacitorConfig = {
  appId: "com.schiessportal.app",
  appName: "Schiessportal",
  webDir: "dist",
  server: { androidScheme: "https", cleartext: false, allowNavigation: LOCAL_BOX_HOSTS },
  plugins: { CapacitorHttp: { enabled: true } }
};
export default config;
