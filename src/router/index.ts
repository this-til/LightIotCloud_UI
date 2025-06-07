import { createRouter, createWebHistory } from "vue-router"
import Login from "../views/Login.vue"
import NotFound from "../views/NotFound.vue"
import Main from "../views/Main.vue"
import AllLight from "../views/AllLight.vue"
import AllCar from "../views/AllCar.vue"
import Light from "../views/Light.vue"
import Car from "../views/Car.vue"


const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/:catchAll(.*)",
            component: NotFound
        },
        {
            path: "/",
            name: "loginIndex",
            component: Login
        },
        {
            path: "/main",
            name: "main",
            component: Main,
            children: [
                {
                    path: "/allLight",
                    name: "allLight",
                    component: AllLight
                },
                {
                    path: "/allCar",
                    name: "allCar",
                    component: AllCar
                },
                {
                    path: "/light",
                    name: "light",
                    component: Light
                },
                {
                    path: "/car",
                    name: "car",
                    component: Car
                }
            ]
        }
    ]
})

export default router
