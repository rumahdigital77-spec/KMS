import type { CapacitorConfig } from '@capacitor/cli';

// KOSTPRO v1.5 final audited Android wrapper.
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
