// stores/store.ts
import { defineStore } from "pinia"
import { createClient } from "graphql-ws"
import type { Client } from "graphql-ws"
import router from "../router"
import { ElNotification } from "element-plus"


interface State {
    token: string | null,
    client: Client | null,
}

const TOKEN_KEY = "auth_token"

export const useGraphqlStore = defineStore(
        "graphql",
        {
            state: (): State => {
                return {
                    token: localStorage.getItem(TOKEN_KEY),
                    client: null
                }
            },
            actions: {
                initializeClient() {
                    this.client = createClient({
                        url: "/api/graphql",
                        connectionParams: {
                            Authorization: this.getToken(),
                            linkType: "WEBSOCKET"
                        },
                        on: {
                            closed: (e) => {
                                console.log("GraphQL client closed:", e)

                                if (e.reason === "Normal Closure") {
                                    return
                                }

                                ElNotification({
                                    type: "error",
                                    title: "链接中断",
                                    message: "链接中断，回到主页面",
                                    duration: 3000
                                })
                                router.push({
                                    path: "/main"
                                })
                            },
                            error: (err) => console.error("[GraphQL-Error]", err),
                            message: (msg) => {
                                if (msg.type === "error") {
                                    console.error("[GraphQL-Message-Error]", msg)
                                } else {
                                    console.log("[GraphQL-Message]", msg)
                                }
                            },
                            connected: () => console.debug("[GraphQL-Connected]")
                        }
                    })
                },
                getClient() {
                    if (this.client) {
                        return this.client
                    }
                    console.log("GraphQL client is null")
                    router.push({
                        path: "/main"
                    })
                    return null
                },
                getToken(): string {
                    if (this.token) {
                        return this.token
                    }
                    return ""
                },
                setToken(token: string): void {
                    localStorage.setItem(TOKEN_KEY, token)
                    this.token = token
                },
                removeToken(): void {
                    localStorage.removeItem(TOKEN_KEY)
                },
                isTokenValid(token: string | null): boolean {
                    if (!token) {
                        return false
                    }
                    try {
                        const payload = JSON.parse(atob(token.split(".")[1]))
                        const currentTime = Math.floor(Date.now() / 1000)
                        return payload.exp > currentTime
                    } catch (e) {
                        return false
                    }
                }
            }
        }
)