<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CubeScene } from '@/cube/CubeScene'
import type { Facelets, MoveToken } from '@/types/cube'

const props = defineProps<{
  facelets: Facelets
  disabled?: boolean
}>()

const canvasHost = ref<HTMLDivElement | null>(null)
let cubeScene: CubeScene | null = null

onMounted(() => {
  if (!canvasHost.value) return
  cubeScene = new CubeScene(canvasHost.value)
  cubeScene.render(props.facelets)
})

watch(
  () => props.facelets,
  (facelets) => cubeScene?.render(facelets),
  { deep: true },
)

onBeforeUnmount(() => cubeScene?.dispose())

async function animateMove(move: MoveToken, nextFacelets: Facelets, duration?: number): Promise<void> {
  await cubeScene?.animateMove(move, nextFacelets, duration)
}

function resetView(): void {
  cubeScene?.resetView()
}

defineExpose({ animateMove, resetView })
</script>

<template>
  <section class="cube-stage" :class="{ 'is-disabled': disabled }">
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

