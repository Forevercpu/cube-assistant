// 浏览器应用入口：装配根组件、状态管理和全局样式。
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// 引入全局主题、布局及各面板样式。
import './style.css'

// 创建 Vue 根应用，先注册 Pinia 状态管理，再挂载到 HTML 的 #app 节点。
createApp(App).use(createPinia()).mount('#app')

