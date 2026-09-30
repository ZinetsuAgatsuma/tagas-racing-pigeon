import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prcs.flightclock',
  appName: 'PRCS Flight Clock',
  webDir: 'dist',
  server: {
    url: 'https://tagas-racing-pigeon.onrender.com',
    cleartext: false,
  },
};

export default config;
