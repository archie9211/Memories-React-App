import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
      plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                  registerType: "autoUpdate",
                  manifest: {
                        name: "Our Memories",
                        short_name: "Memories",
                        description: "A timeline of our cherished memories",
                        theme_color: "#4f46e5",

                        icons: [
                              {
                                    src: "/android-chrome-192x192.png",
                                    sizes: "192x192",
                                    type: "image/png",
                                    purpose: "any maskable",
                              },
                              {
                                    src: "/android-chrome-512x512.png",
                                    sizes: "512x512",
                                    type: "image/png",
                                    purpose: "any maskable",
                              },
                        ],
                  },
                  workbox: {
                        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
                        runtimeCaching: [
                              {
                                    urlPattern:
                                          /^https:\/\/memories\.archie9211\.com\/api/,
                                    handler: "NetworkFirst",
                                    options: {
                                          cacheName: "api-cache",
                                          expiration: {
                                                maxEntries: 50,
                                                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                                          },
                                    },
                              },
                        ],
                  },
            }),
      ],
});
