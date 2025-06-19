import { fileURLToPath, URL } from "node:url"

import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import vueDevTools from "vite-plugin-vue-devtools"

import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { ElementPlusResolver } from "unplugin-vue-components/resolvers"

// https://vite.dev/config/
export default defineConfig(
        {
            plugins: [
                vue(),
                vueDevTools(),

                AutoImport({
                    resolvers: [ElementPlusResolver()]
                }),
                Components({
                    resolvers: [ElementPlusResolver()]
                })
            ],
            resolve: {
                alias: {
                    "@": fileURLToPath(new URL("./src", import.meta.url))
                }
            },
            server: {
                proxy: {
                    "/api": {
                        target: "http://localhost:8080",
                        ws: true,
                        changeOrigin: true,
                        rewrite: (path) => path.replace(/^\/api/, "")
                    },
                    "/lightCam": {
                        target : "whep://192.168.117.2:8889/lightCam",
                        ws: true,
                        changeOrigin: true,
                        rewrite: (path) => path.replace(/^\/lightCam/, "")
                    }
                }
            }
        }
)
