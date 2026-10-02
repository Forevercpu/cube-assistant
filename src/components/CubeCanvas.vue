<script setup lang="ts">
// 三维场景的 Vue 适配组件，负责挂载、状态监听和销毁。
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CubeScene } from '@/cube/CubeScene'
import type { Facelets, MoveToken } from '@/types/cube'

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
async function animateMove(move: MoveToken, nextFacelets: Facelets, duration?: number): Promise<void> {
  await cubeScene?.animateMove(move, nextFacelets, duration)
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
    <div class="stage-badge">
      <span class="status-dot" />
      THREE.JS 实时渲染
    </div>
    <button class="view-reset" type="button" title="恢复默认视角" @click="resetView">
      ↺ <span>重置视角</span>
    </button>
    <div class="stage-guide">
      <span class="mouse-icon">↔</span>
      按住鼠标拖动观察 · 滚轮缩放
    </div>
  </section>
</template>

