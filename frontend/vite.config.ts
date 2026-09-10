import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'robots.txt'],
      manifest: {
        name: 'MyClassPluss - Gestor Acadêmico',
        short_name: 'MyClassPluss',
        description: 'Plataforma Interativa de Ensino e Avaliação',
        theme_color: '#0f172a',
        background_color: '#070b19',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Configuração de cache para requisições de API e páginas
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'myclasspluss-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0', // 👈 Libera o acesso para dispositivos externos na rede local
    port: 5173,      // 👈 Mantém a porta padrão do Vite
  },
});