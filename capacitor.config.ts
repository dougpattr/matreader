import type { CapacitorConfig } from '@capacitor/cli';

/* Pronto para empacotar como app nativo: `npx cap add android` (ou ios)
   e depois `npm run build && npx cap sync`. */
const config: CapacitorConfig = {
  appId: 'io.github.dougpattr.matreader',
  appName: 'MatReader',
  webDir: 'dist',
  backgroundColor: '#f4ede3',
  android: { allowMixedContent: false },
};

export default config;
