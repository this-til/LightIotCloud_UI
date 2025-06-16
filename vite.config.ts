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
                    "/device": {
                        target: "http://192.168.117.2:8888",
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/device/, ""),
                        configure: (proxy, options) => {
                            proxy.on('proxyRes', (proxyRes) => {
                                proxyRes.headers['Access-Control-Allow-Origin'] = '*'
                                proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
                                proxyRes.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, content-type, Authorization'
                            })
                        }
                    }
                }
            }
        }
)
