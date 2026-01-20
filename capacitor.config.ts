import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raute.app',
  appName: 'Raute',
  webDir: 'out',
  server: {
    url: 'https://raute-app-test.vercel.app',
    cleartext: true
  }
};

export default config;
