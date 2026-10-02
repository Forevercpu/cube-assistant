// 浏览器应用入口：装配根组件、状态管理和全局样式。
import { createApp } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"
import router from '@/router'
import * as ElementPlusIconsVue from "@element-plus/icons-vue"
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import "./styles/style.scss"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount("#app")
