import { createRouter, createWebHistory } from "vue-router"
import Login from "../views/Login.vue"
import NotFound from "../views/NotFound.vue"
import Main from "../views/Main.vue"
import Light from "../views/Light.vue"
import Car from "../views/Car.vue"
import LightContent from "../views/LightContent.vue"
import LightHistoryData from "../views/LightHistoryData.vue"
import LightDetection from "../views/LightDetection.vue"
import LightMonitor from "../views/LightMonitor.vue"
import DeviceListPlate from "../components/DeviceListPlate.vue"
import Uav from "../views/Uav.vue"


const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/:catchAll(.*)",
            component: NotFound
        },
        {
            path: "/",
            component: Login
        },
        {
            path: "/main",
            component: Main,
            children: [
                {
                    path: "/deviceList/:type",
                    component: DeviceListPlate,
                    props: true
                },
                {
                    path: "/light",
                    name: "light",
                    component: Light,
                    children: [
                        {
                            path: "/lightContent",
                            name: "light-content",
                            component: LightContent
                        },
                        {
                            path: "historyData",
                            name: "light-history",
                            component: LightHistoryData
                        },
                        {
                            path: "detection",
                            name: "light-detection",
                            component: LightDetection
                        },
                        {
                            path: "monitor",
                            name: "light-monitor",
                            component: LightMonitor
                        }
                    ]
                },
                {
                    path: "/car",
                    name: "car",
                    component: Car
                },
                {
                    path: "/uav",
                    name: "uav",
                    component: Uav
                }
            ]
        }
    ]
})

export default router
