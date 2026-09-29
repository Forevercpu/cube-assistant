<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import CubeCanvas from '@/components/CubeCanvas.vue'
import FaceEditor from '@/components/FaceEditor.vue'
import MoveControls from '@/components/MoveControls.vue'
import SolutionPanel from '@/components/SolutionPanel.vue'
import { applyMove, invertMove } from '@/cube/facelets'
import { useCubeStore } from '@/stores/cube'
import type { Face, Facelets, MoveToken } from '@/types/cube'

interface CubeCanvasExpose {
  animateMove: (move: MoveToken, nextFacelets: Facelets, duration?: number) => Promise<void>
  resetView: () => void
}

const store = useCubeStore()
const {
  facelets,
  history,
  solution,
  solutionIndex,
  selectedColor,
  solving,
  solveError,
  mode,
  solved,
  counts,
} = storeToRefs(store)

const cubeCanvas = ref<CubeCanvasExpose | null>(null)
const isAnimating = ref(false)
const playing = ref(false)

async function performMove(move: MoveToken, record = true, duration = 280): Promise<void> {
  if (isAnimating.value) return
  isAnimating.value = true
  const nextFacelets = applyMove(facelets.value, move)

  try {
    await cubeCanvas.value?.animateMove(move, nextFacelets, duration)
    store.commitMove(move, record)
  } finally {
    isAnimating.value = false
  }
}

async function undo(): Promise<void> {
  const move = store.takeUndoMove()
  if (move) await performMove(move, false)
}

function switchMode(nextMode: 'practice' | 'editor'): void {
  playing.value = false
  store.setMode(nextMode)
}

async function solveCube(): Promise<void> {
  playing.value = false
  try {
    await store.solve()
  } catch {
    // 具体错误由求解器返回并显示在录入面板中。
  }
}

async function nextSolutionStep(): Promise<void> {
  const move = solution.value[solutionIndex.value]
  if (!move || isAnimating.value) return
  await performMove(move, false, 420)
  solutionIndex.value += 1
}

async function previousSolutionStep(): Promise<void> {
  if (solutionIndex.value === 0 || isAnimating.value) return
  playing.value = false
  const move = solution.value[solutionIndex.value - 1]
  if (!move) return
  await performMove(invertMove(move), false, 360)
  solutionIndex.value -= 1
}

async function toggleAutoPlay(): Promise<void> {
  playing.value = !playing.value
  while (playing.value && solutionIndex.value < solution.value.length) {
    await nextSolutionStep()
    await new Promise((resolve) => window.setTimeout(resolve, 140))
  }
  playing.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if (mode.value !== 'practice' || isAnimating.value) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  const face = event.key.toUpperCase()
  if (!['U', 'R', 'F', 'D', 'L', 'B'].includes(face)) return
  event.preventDefault()
  void performMove(`${face}${event.shiftKey ? "'" : ''}` as MoveToken)
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <a class="brand" href="#" aria-label="魔方助手首页">
        <span class="brand-mark">
          <i /><i /><i />
          <i /><i /><i />
          <i /><i /><i />
        </span>
        <span>
          <strong>魔方助手</strong>
          <small>CUBE ASSISTANT</small>
        </span>
      </a>

      <nav class="mode-tabs" aria-label="功能模式">
        <button type="button" :class="{ active: mode === 'practice' }" @click="switchMode('practice')">
          自由练习
        </button>
        <button type="button" :class="{ active: mode === 'editor' }" @click="switchMode('editor')">
          复原助手
          <span>核心</span>
        </button>
      </nav>

      <a class="github-link" href="https://github.com/Forevercpu/cube-assistant" target="_blank" rel="noreferrer">
        GitHub ↗
      </a>
    </header>

    <main class="main-content">
      <div class="intro-row">
        <div>
          <p class="eyebrow">{{ mode === 'practice' ? '3D INTERACTIVE CUBE' : 'REAL CUBE SOLVER' }}</p>
          <h1>{{ mode === 'practice' ? '转动、观察、熟悉每一面' : '把手中的魔方，带到屏幕上' }}</h1>
          <p>
            {{
              mode === 'practice'
                ? '用鼠标观察魔方，通过按钮或键盘完成标准转层。所有动作都由独立逻辑状态驱动。'
                : '依次录入六面颜色，系统检查状态后生成复原路线，再用 3D 动画一步一步带你完成。'
            }}
          </p>
        </div>
        <div class="status-card" :class="{ solved }">
          <span class="status-ring">{{ solved ? '✓' : '…' }}</span>
          <div>
            <small>当前状态</small>
            <strong>{{ solved ? '已完成' : mode === 'editor' ? '等待复原' : '练习中' }}</strong>
          </div>
        </div>
      </div>

      <div class="workspace-grid">
        <div class="visual-column">
          <CubeCanvas ref="cubeCanvas" :facelets="facelets" :disabled="isAnimating" />

          <MoveControls
            v-if="mode === 'practice'"
            :disabled="isAnimating"
            :can-undo="history.length > 0"
            @move="performMove"
            @undo="undo"
            @scramble="store.scramble"
            @reset="store.resetSolved"
          />

          <SolutionPanel
            v-if="mode === 'editor' && solution.length > 0"
            :steps="solution"
            :index="solutionIndex"
            :playing="playing"
            :disabled="isAnimating"
            @previous="previousSolutionStep"
            @next="nextSolutionStep"
            @toggle-play="toggleAutoPlay"
          />

          <section v-if="mode === 'editor' && solution.length === 0 && solved && !solveError" class="panel solved-note">
            <span>✓</span>
            <div><strong>当前魔方已经完成</strong><p>修改任意非中心色块后，可以重新检查并生成路线。</p></div>
          </section>
        </div>

        <aside class="side-column">
          <FaceEditor
            v-if="mode === 'editor'"
            :facelets="facelets"
            :selected-color="selectedColor"
            :counts="counts"
            :solving="solving"
            :solve-error="solveError"
            @update:selected-color="selectedColor = $event"
            @sticker="(face: Face, index: number, color) => store.setSticker(face, index, color)"
            @solve="solveCube"
            @reset="store.resetSolved"
          />

          <section v-else class="panel shortcuts-panel">
            <p class="eyebrow">快捷操作</p>
            <h2>键盘也能转</h2>
            <div class="shortcut-list">
              <div><kbd>R</kbd><span>右面顺时针</span><kbd>⇧ R</kbd><span>右面逆时针</span></div>
              <div><kbd>U</kbd><span>上面顺时针</span><kbd>⇧ U</kbd><span>上面逆时针</span></div>
              <div><kbd>F</kbd><span>前面顺时针</span><kbd>⇧ F</kbd><span>前面逆时针</span></div>
            </div>
            <div class="notation-note">
              <strong>公式怎么看？</strong>
              <p>字母表示转动的面；带 <code>'</code> 表示逆时针；带 <code>2</code> 表示旋转 180°。</p>
            </div>
          </section>
        </aside>
      </div>
    </main>

    <footer>
      <span>魔方助手 · 三阶魔方第一版</span>
      <span>Vue 3 · TypeScript · Three.js · cubejs</span>
    </footer>
  </div>
</template>

