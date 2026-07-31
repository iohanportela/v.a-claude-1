import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.local.produtividadecamarao',
  appName: 'Produtividade Camarão',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  },
  plugins: {
    // Nenhum dado é enviado para servidores: todos os plugins usados
    // (Camera, Filesystem, ML Kit Text Recognition) operam localmente.
  }
};

export default config;
