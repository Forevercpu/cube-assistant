// 开发服务器与生产打包配置，在 Node.js 环境执行。
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'

/** cubejs 的旧浏览器全局探测依赖顶层 this；模块构建统一使用其 CommonJS 入口。 */
function cubejsCompatibility(): Plugin {
  return {
    name: 'cubejs-module-compatibility',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/cubejs/lib/solve.js')) return
      return code.replace("this.Cube || require('./cube')", "require('./cube')")
    },
  }
}

// https://vite.dev/config/
/** Vite 配置入口；defineConfig 提供配置类型提示。 */
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://139.224.196.60',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // 解析 Vue 单文件组件及 script setup 的编译宏。
  plugins: [cubejsCompatibility(), vue()],
  optimizeDeps: {
    rolldownOptions: { plugins: [cubejsCompatibility()] },
  },
  worker: {
    plugins: () => [cubejsCompatibility()],
  },
  resolve: {
    alias: {
      // 将 @ 映射到 src 的绝对路径，与 tsconfig.app.json 的类型解析约定一致。
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
