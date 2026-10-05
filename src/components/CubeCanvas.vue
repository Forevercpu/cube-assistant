<script setup lang="ts">
// 三维场景的 Vue 适配组件，负责挂载、状态监听和销毁。
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { CubeScene } from "@/cube/CubeScene"
import type { Facelets, MoveToken } from "@/types/cube"

/** 由父组件传入逻辑色块状态与动画期间的视觉禁用标记。 */
const props = defineProps<{
  // 当前六面颜色快照。
  facelets: Facelets
  // 可选标记，仅控制舞台样式。
  disabled?: boolean
}>()

// 容器 DOM 引用，挂载前为空，场景画布插入此节点。
const canvasHost = ref<HTMLDivElement | null>(null)
// 非响应式场景实例，避免 Vue 代理 Three.js 对象。
let cubeScene: CubeScene | null = null

// DOM 就绪后创建场景，并绘制首次传入的魔方状态。
onMounted(() => {
  if (!canvasHost.value) return
  cubeScene = new CubeScene(canvasHost.value)
  cubeScene.render(props.facelets)
})

// 深度监听外部色块变更，编辑或重置状态时重新绘制场景。
watch(
  () => props.facelets,
  (facelets) => cubeScene?.render(facelets),
  { deep: true },
)

// 离开组件时释放 WebGL 资源与尺寸监听。
onBeforeUnmount(() => cubeScene?.dispose())

/** 将父组件的动作转发给场景；实例未就绪时可选链安全跳过。 */
async function animateMove(
  move: MoveToken,
  nextFacelets: Facelets,
  duration?: number,
  reverseHalfTurn = false,
): Promise<void> {
  await cubeScene?.animateMove(move, nextFacelets, duration, reverseHalfTurn)
}

/** 恢复视角，既供舞台按钮使用，也对父组件公开。 */
function resetView(): void {
  cubeScene?.resetView()
}

// script setup 默认隐藏内部成员，仅公开这两个控制方法。
defineExpose({ animateMove, resetView })
</script>

<template>
  <section class="cube-stage" :class="{ 'is-disabled': disabled }">
    <!-- WebGL 画布挂载区域，其余提示与按钮覆盖在画布上方。 -->
    <div ref="canvasHost" class="cube-canvas" />
    <button
      class="view-reset"
      type="button"
      title="恢复默认视角"
      @click="resetView"
    >
      ↺ <span>重置视角</span>
    </button>
    <div class="stage-guide">
      <span class="mouse-icon">↔</span>
      按住鼠标拖动观察 · 滚轮缩放
    </div>
  </section>
</template>

<style scoped lang="scss">
/* 三维舞台容器：网格背景、环境光与裁剪边界。 */
.cube-stage {
  position: relative;
  min-height: 590px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    radial-gradient(
      circle at 50% 46%,
      rgba(78, 116, 184, 0.14),
      transparent 36%
    ),
    #0e131c;
  background-size:
    34px 34px,
    34px 34px,
    auto,
    auto;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 24px 80px rgba(0, 0, 0, 0.2);

  /* 底部模糊椭圆模拟舞台投影。 */
  &::before {
    content: "";
    position: absolute;
    left: 18%;
    right: 18%;
    bottom: 14%;
    height: 60px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    filter: blur(24px);
  }

  &.is-disabled {
    cursor: wait;
  }
}

/* 画布绝对定位铺满舞台，提示和按钮通过 z-index 覆盖在其上。 */
.cube-canvas {
  position: absolute;
  inset: 0;

  :deep(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
}

/* 舞台上的渲染标记、重置视角按钮和鼠标操作提示。 */
.view-reset,
.stage-guide {
  position: absolute;
  z-index: 2;
}

.view-reset {
  top: 18px;
  right: 18px;
  padding: 8px 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: #8e99aa;
  background: rgba(9, 12, 18, 0.62);
  cursor: pointer;
  backdrop-filter: blur(10px);

  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.stage-guide {
  bottom: 18px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  color: #6f7a8c;
  background: rgba(9, 12, 18, 0.58);
  font-size: 13px;
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

.mouse-icon {
  color: #abb5c5;
  font-size: 18px;
}

@media (max-width: 1200px) {
  .cube-stage {
    min-height: 540px;
  }

  .view-reset span {
    display: none;
  }
}
</style>
