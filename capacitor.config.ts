import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raute.app',
  appName: 'Raute',
  webDir: 'out',
  server: {
    url: 'https://raute.io',
    cleartext: true
  }
};

export default config;
