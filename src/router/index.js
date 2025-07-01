import { createRouter, createWebHistory } from "vue-router"
import Login from "../views/Login.vue"
import NotFound from "../views/NotFound.vue"
import Main from "../views/Main.vue"
import Dashboard from "../views/Dashboard.vue"
import Light from "../views/Light.vue"
import Car from "../views/Car.vue"
import LightContent from "../views/LightContent.vue"
import LightHistoryData from "../views/LightHistoryData.vue"
import LightDetection from "../views/LightDetection.vue"
import LightMonitor from "../views/LightMonitor.vue"
import LightIntercom from "../views/LightIntercom.vue"
import DeviceListPlate from "../components/DeviceListPlate.vue"
import Uav from "../views/Uav.vue"
import CarControl from "../views/CarControl.vue"
import UavControl from "../views/UavContent.vue"

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
                    path: "/Dashboard",
                    name: "dashboard",
                    component: Dashboard
                },
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
                            path: "/historyData",
                            name: "light-history",
                            component: LightHistoryData
                        },
                        {
                            path: "/detection",
                            name: "light-detection",
                            component: LightDetection
                        },
                        {
                            path: "/monitor",
                            name: "light-monitor",
                            component: LightMonitor
                        },
                        {
                            path: "/intercom",
                            name: "light-intercom",
                            component: LightIntercom
                        }
                    ]
                },
                {
                    path: "/car",
                    name: "car",
                    component: Car,
                    children:[
                      {
                        path: "/CarControl",
                        name: "CarControl",
                        component: CarControl
                      }
                    ]
                },
                {
                    path: "/uav",
                    name: "uav",
                    component: Uav,
                    children:[
                      {
                        path:'/UavContent',
                        name: "UavContent",
                        component: UavControl
                      }
                    ]
                }
            ]
        }
    ]
})

export default router
