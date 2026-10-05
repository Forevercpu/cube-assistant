<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import CubeCanvas from '@/components/CubeCanvas.vue'
import PracticeMode from '@/components/practice/PracticeMode.vue'
import PracticeGuide from '@/components/practice/PracticeGuide.vue'
import RestoreAssistant from '@/components/restore/RestoreAssistant.vue'
import RestoreEditor from '@/components/restore/RestoreEditor.vue'
import { applyMove } from '@/cube/facelets'
import { useCubeStore, useRestoreCubeStore } from '@/stores/cube'
import type { Facelets, MoveToken } from '@/types/cube'
const props = defineProps<{ mode: 'practice' | 'editor' }>()
interface CubeCanvasExpose {
  // 播放转层动画；下一状态快照用于动画结束后的精确重建。
  animateMove: (
    move: MoveToken,
    nextFacelets: Facelets,
    duration?: number,
    reverseHalfTurn?: boolean,
  ) => Promise<void>
  // 恢复默认观察视角。
  resetView: () => void
}
const practiceStore = useCubeStore()
const restoreStore = useRestoreCubeStore()
const mode = computed(() => props.mode)
const solved = computed(() => mode.value === 'practice' ? practiceStore.solved : restoreStore.solved)
const practiceCanvas = ref<CubeCanvasExpose | null>(null)
const restoreCanvas = ref<CubeCanvasExpose | null>(null)
const animating = ref({ practice: false, editor: false })
const isAnimating = computed(() => animating.value[mode.value])
const restoreAssistant = ref<{ stop: () => void } | null>(null)
function stopPlayback() { restoreAssistant.value?.stop() }
watch(mode, stopPlayback, { flush: 'sync' })
onBeforeRouteLeave(stopPlayback)
onBeforeRouteUpdate(stopPlayback)
onBeforeUnmount(stopPlayback)
async function performMove(
  move: MoveToken,
  record = true,
  duration?: number,
  reverseHalfTurn = false,
): Promise<void> {
  // 捕获操作所属模式，切换页面后仍只更新原来的魔方。
  const moveMode = mode.value
  const store = moveMode === 'practice' ? practiceStore : restoreStore
  const canvas = moveMode === 'practice' ? practiceCanvas.value : restoreCanvas.value
  if (animating.value[moveMode]) return
  animating.value[moveMode] = true
  // 预计算动画终点，不立即提交，避免响应式监听提前覆盖转层画面。
  const nextFacelets = applyMove(store.facelets, move)

  try {
    await canvas?.animateMove(move, nextFacelets, duration, reverseHalfTurn)
    store.commitMove(move, record)
  } finally {
    // 即使动画失败也释放互斥标记，避免界面一直禁用。
    animating.value[moveMode] = false
  }
}
</script>

<template>
<main class="main-content">
  <div class="intro-row">
        <div>
          <p class="eyebrow">
            {{
              mode === "practice" ? "3D INTERACTIVE CUBE" : "REAL CUBE SOLVER"
            }}
          </p>
          <h1>
            {{
              mode === "practice"
                ? "转动、观察、熟悉每一面"
                : "把手中的魔方，带到屏幕上"
            }}
          </h1>
          <p>
            {{
              mode === "practice"
                ? "用鼠标观察魔方，通过按钮或键盘完成标准转层。所有动作都由独立逻辑状态驱动。"
                : "依次录入六面颜色，系统检查状态后生成复原路线，再用 3D 动画一步一步带你完成。"
            }}
          </p>
        </div>
        <div class="status-card" :class="{ solved }">
          <span class="status-ring">{{ solved ? "✓" : "…" }}</span>
          <div>
            <small>当前状态</small>
            <strong>{{
              solved ? "已完成" : mode === "editor" ? "等待复原" : "练习中"
            }}</strong>
          </div>
        </div>
      </div>
  <div class="workspace-grid">
    <div class="visual-column">
      <CubeCanvas
            v-show="mode === 'practice'"
            ref="practiceCanvas"
            :facelets="practiceStore.facelets"
            :disabled="animating.practice"
          />
      <CubeCanvas
            v-show="mode === 'editor'"
            ref="restoreCanvas"
            :facelets="restoreStore.facelets"
            :disabled="animating.editor"
          />
      <PracticeMode v-if="mode === 'practice'" :active="true" :disabled="isAnimating" :perform-move="performMove" />
      <RestoreAssistant v-else ref="restoreAssistant" :active="true" :disabled="isAnimating" :perform-move="performMove" />
    </div>
    <aside class="side-column">
      <RestoreEditor v-if="mode === 'editor'" @solve="stopPlayback" />
      <PracticeGuide v-else />
    </aside>
  </div>
</main>
</template>

<style scoped lang="scss">
@use "@/styles/shared";
@include shared.eyebrow;
.main-content {
  width: min(1440px, calc(100% - 64px));
  margin: 0 auto;
  padding: 48px 0 64px;
}

.intro-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 28px;

  h1 {
    margin: 8px 0 10px;
    font-size: clamp(34px, 3.2vw, 48px);
    line-height: 1.12;
    letter-spacing: -0.045em;
  }

  > div:first-child > p:last-child {
    max-width: 720px;
    margin: 0;
    color: var(--muted);
    line-height: 1.7;
  }
}

/* 当前魔方状态卡；已复原时使用强调色边框与图标。 */
.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 150px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(17, 22, 31, 0.72);

  &.solved {
    border-color: rgba(120, 228, 187, 0.25);

    .status-ring {
      color: #06251b;
      border-color: transparent;
      background: var(--primary);
    }
  }

  div {
    display: grid;
    gap: 3px;
  }

  small {
    color: #697487;
    font-size: 12px;
  }

  strong {
    font-size: 15px;
  }
}

.status-ring {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #9aa5b5;
  border: 1px solid #384151;
  background: #171d27;
}

/* 工作区左右双列：左列弹性伸展，右列固定宽度。 */
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(620px, 1fr) 460px;
  align-items: start;
  gap: 22px;
}

/* 右侧面板在滚动时保持可见，偏移量避开吸顶页头。 */
.visual-column,
.side-column {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.side-column {
  position: sticky;
  top: 90px;
}

@media (max-width: 1200px) {
  .workspace-grid {
    grid-template-columns: minmax(570px, 1fr) 420px;
  }
}</style>
