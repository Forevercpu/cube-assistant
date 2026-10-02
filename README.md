# 魔方助手

基于 Vue 3、TypeScript 和 Three.js 的三阶魔方练习与复原工具。

## 当前功能

### 自由练习

- Three.js 实时渲染三阶魔方
- 鼠标拖动观察、滚轮缩放、重置视角
- 支持 `U / D / L / R / F / B` 顺时针及逆时针转动
- 支持键盘操作，按住 `Shift` 反向转动
- 随机打乱、撤销一步、恢复完成状态
- 逻辑状态与 3D 渲染状态分离

### 复原助手

- 通过六面展开图录入 54 个色块
- 固定“白色中心朝上、绿色中心朝前”的录入方向
- 实时统计六种颜色数量
- 检查角块、棱块、朝向和排列是否合法
- 通过 `cubejs` Two-Phase 算法生成复原路线
- 求解过程运行在 Web Worker，不阻塞 Three.js 主线程
- 支持上一步、下一步和自动播放复原动画

## 技术栈

- Vue 3 + TypeScript + Vite
- Three.js
- Pinia
- cubejs
- Vitest
- pnpm

## 本地运行

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
pnpm preview
```

测试：

```bash
pnpm test
pnpm typecheck
```

## 目录结构

```text
src/
├── components/       # 页面功能组件
├── cube/             # 魔方坐标、转层规则和 Three.js 场景
├── stores/           # Pinia 业务状态
├── types/            # 类型声明
└── workers/          # 魔方求解 Worker
```

## 录入约定

录入实体魔方时，需要始终保持白色中心朝上、绿色中心朝前。页面展开图及求解器统一使用 `U R F D L B` 面顺序，避免背面和底面方向录反。

## 后续计划

- 直接拖动 3D 色块完成转层
- 接入个人网站账号体系
- 在线计时、每日挑战和排行榜
- 对局回放与服务端成绩校验

## 文件说明与注释约定

源码中的中文注释说明函数职责、变量含义、类型约束和重要实现步骤。TypeScript 的类型声明只约束代码使用方式，不替代 Worker 中的运行时合法性校验。

| 文件 | 职责 |
| --- | --- |
| `index.html` / `src/main.ts` | 页面元信息、Vue 挂载点与应用初始化 |
| `src/App.vue` | 页面布局、键盘事件、动画与复原进度协调 |
| `src/components/CubeCanvas.vue` | Three.js 场景的挂载、状态监听与资源销毁 |
| `src/components/FaceEditor.vue` | 调色板、颜色统计、六面录入与求解入口 |
| `src/components/MoveControls.vue` | 自由练习操作事件 |
| `src/components/SolutionPanel.vue` | 复原动作说明、进度与播放控制 |
| `src/stores/cube.ts` | 逻辑状态、历史、模式和异步求解请求 |
| `src/cube/facelets.ts` | 配色、坐标映射、动作解析和色块置换 |
| `src/cube/CubeScene.ts` | 三维模型、鼠标视角与转层动画 |
| `src/cube/facelets.test.ts` | 转层可逆性与 cubejs 求解兼容性测试 |
| `src/types/cube.ts` | 共享业务类型与 Worker 响应协议 |
| `src/types/cubejs.d.ts` | cubejs 外部库类型声明 |
| `src/workers/solver.worker.ts` | 状态合法性校验与后台求解 |
| `src/style.css` | 全局主题、组件布局和交互状态 |
| `vite.config.ts` | Vue 插件与源码路径别名 |
| `tsconfig*.json` | 根项目引用、浏览器和 Node.js 类型检查配置 |
| `.gitignore` / `.vscode/extensions.json` | Git 忽略规则与编辑器扩展推荐 |

`package.json` 使用严格 JSON，不能直接插入注释，其字段说明如下：

- `name`、`version` 标识项目；`private` 防止误发布至 npm；`type: module` 启用 ES 模块。
- `scripts.dev` 启动开发服务器；`build` 先检查类型再构建；`typecheck` 只检查类型；`test` 运行现有测试；`preview` 预览构建产物。
- `dependencies` 是应用依赖：Vue 负责组件，Pinia 管理状态，Three.js 渲染魔方，cubejs 负责求解。
- `devDependencies` 提供构建、类型声明与测试工具；版本前缀 `^` 允许兼容的次版本/补丁更新，`~` 允许补丁更新。

`pnpm-lock.yaml` 是自动生成的依赖锁定文件，`LICENSE` 是许可证原文；二者不插入额外注释。
