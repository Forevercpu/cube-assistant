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
