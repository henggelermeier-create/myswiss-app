import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.schiessportal.mobile',
  appName: 'Schiessportal',
  webDir: 'dist',
  server: {
    url: 'https://schiessportal.com',
    cleartext: true,
    allowNavigation: [
      'schiessportal.com',
      '*.schiessportal.com',
      'schiessportal.local',
      'schiessportal.local:8080'
    ]
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
