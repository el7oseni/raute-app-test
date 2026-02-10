import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.raute.app',
  appName: 'Raute',
  webDir: 'out',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  // Deep linking for OAuth redirects
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  }
};

export default config;
