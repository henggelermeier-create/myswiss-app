export type Platform = "android" | "ios" | "web";
export type OpenWifiSettingsResult = { opened: boolean; hint: string };
export function wifiSettingsAction(platform: Platform): OpenWifiSettingsResult {
  if (platform === "android") return { opened: true, hint: "Öffnet die WLAN-Einstellungen. Bitte «Schiessportal-Box-…» auswählen." };
  if (platform === "ios") return { opened: true, hint: "Öffnet die Einstellungen. Bitte auf «WLAN» tippen und «Schiessportal-Box-…» auswählen." };
  return { opened: false, hint: "Bitte manuell mit dem WLAN «Schiessportal-Box-…» verbinden." };
}
export function openSystemWifiSettings(platform: Platform): OpenWifiSettingsResult {
  const result = wifiSettingsAction(platform);
  if (platform === "android") window.location.href = "intent://#Intent;action=android.settings.WIFI_SETTINGS;end";
  else if (platform === "ios") window.location.href = "app-settings:";
  return result;
}
