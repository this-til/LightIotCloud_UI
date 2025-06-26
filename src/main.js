import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from "axios"
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { createPinia } from "pinia"

// --- 新增：引入新版 tsParticles Vue3 插件 & 引擎加载器
import Particles from '@tsparticles/vue3'
import { loadFull } from 'tsparticles'

const app = createApp(App)

app.use(router)
app.use(ElementPlus)
app.use(createPinia())

// 注册 tsParticles，并在 init 钩子里加载完整功能
app.use(Particles, {
  id: 'tsparticles',     // 可选：默认容器 ID
  init: async engine => {
    await loadFull(engine)
  }
})

axios.defaults.withCredentials = true

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
