import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kostpro.kms',
  appName: 'KOSTPRO',
  webDir: 'public',
  server: {
    url: 'https://kostpro.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['kostpro.vercel.app'],
  },
};

export default config;
