import { createRouter, createWebHistory } from "vue-router"
import Login from "../views/Login.vue"
import NotFound from "../views/NotFound.vue"
import Main from "../views/Main.vue"
import AllLight from "../views/AllLight.vue"
import AllCar from "../views/AllCar.vue"
import Light from "../views/Light.vue"
import Car from "../views/Car.vue"
import LightContent from "../views/LightContent.vue"
import LightHistoryData from "../views/LightHistoryData.vue"


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
                    path: "/allLight",
                    component: AllLight
                },
                {
                    path: "/allCar",
                    component: AllCar
                },
                {
                    path: "/light",
                    component: Light,
                    children: [
                        {
                            path: "/light",
                            component: LightContent
                        },
                        {
                            path: "/lightHistoryData",
                            component: LightHistoryData
                        }
                    ]
                },
                {
                    path: "/car",
                    component: Car
                }
            ]
        }
    ]
})

export default router
