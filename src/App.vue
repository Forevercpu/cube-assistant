<script setup lang="ts">
// 页面协调层：连接业务仓库、3D 动画和各个操作面板。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import CubeCanvas from '@/components/CubeCanvas.vue'
import FaceEditor from '@/components/FaceEditor.vue'
import MoveControls from '@/components/MoveControls.vue'
import SolutionPanel from '@/components/SolutionPanel.vue'
import { applyMove, invertMove } from '@/cube/facelets'
import { useCubeStore } from '@/stores/cube'
import type { Face, Facelets, MoveToken } from '@/types/cube'

/** 子组件通过 defineExpose 暴露的实例方法，约束模板 ref 的调用方式。 */
interface CubeCanvasExpose {
  // 播放转层动画；下一状态快照用于动画结束后的精确重建。
  animateMove: (move: MoveToken, nextFacelets: Facelets, duration?: number) => Promise<void>
  // 恢复默认观察视角。
  resetView: () => void
}

// 获取页面共享的魔方业务仓库。
const store = useCubeStore()
// storeToRefs 保留解构后状态的响应性，action 则直接从 store 调用。
const {
  // 六面颜色，驱动三维展示和展开图。
  facelets,
  // 自由练习的可撤销动作记录。
  history,
  // 求解器给出的有序复原动作。
  solution,
  // 已执行步数及下一步动作的位置。
  solutionIndex,
  // 录入面板当前的画笔颜色。
  selectedColor,
  // 是否正在后台求解。
  solving,
  solveStatus,
  // 录入或求解失败的显示文本。
  solveError,
  // 当前页面模式：自由练习或复原助手。
  mode,
  // 当前各面是否已成为单色。
  solved,
  // 六种颜色的实时数量。
  counts,
} = storeToRefs(store)

// 模板组件引用，挂载前为 null，挂载后可调用公开场景方法。
const cubeCanvas = ref<CubeCanvasExpose | null>(null)
// 转层互斥标记，防止多个动作同时改动场景。
const isAnimating = ref(false)
// 自动播放开关，在模式切换、求解或回退时停止后续播放。
const playing = ref(false)

/**
 * 统一执行转动：计算下一快照、等待动画完成，再提交逻辑状态。
 * @param move 要执行的标准动作记号。
 * @param record 是否加入练习历史；撤销与复原播放时为 false。
 * @param duration 每次 90° 转动的持续时间，单位为毫秒。
 */
async function performMove(move: MoveToken, record = true, duration?: number): Promise<void> {
  if (isAnimating.value) return
  isAnimating.value = true
  // 预计算动画终点，不立即提交，避免响应式监听提前覆盖转层画面。
  const nextFacelets = applyMove(facelets.value, move)

  try {
    await cubeCanvas.value?.animateMove(move, nextFacelets, duration)
    store.commitMove(move, record)
  } finally {
    // 即使动画失败也释放互斥标记，避免界面一直禁用。
    isAnimating.value = false
  }
}

/** 从历史取出逆动作并播放；撤销动作不再次加入历史。 */
async function undo(): Promise<void> {
  // 最近一步的逆操作，没有历史时为 null。
  const move = store.takeUndoMove()
  if (move) await performMove(move, false)
}

/** 停止自动播放，并切换练习/复原录入模式。 */
function switchMode(nextMode: 'practice' | 'editor'): void {
  playing.value = false
  store.setMode(nextMode)
}

/** 发起异步求解；错误由仓库保存，录入面板负责展示。 */
async function solveCube(): Promise<void> {
  playing.value = false
  try {
    await store.solve()
  } catch {
    // 具体错误由求解器返回并显示在录入面板中。
  }
}

/** 执行当前复原动作，完成后将待执行索引前移一位。 */
async function nextSolutionStep(): Promise<void> {
  // 当前待执行动作，越过路线末尾时为 undefined。
  const move = solution.value[solutionIndex.value]
  if (!move || isAnimating.value) return
  await performMove(move, false)
  solutionIndex.value += 1
}

/** 对上一个已执行动作取逆，回到前一步并更新进度。 */
async function previousSolutionStep(): Promise<void> {
  if (solutionIndex.value === 0 || isAnimating.value) return
  playing.value = false
  // 最近完成的复原动作；不是当前待执行动作。
  const move = solution.value[solutionIndex.value - 1]
  if (!move) return
  await performMove(invertMove(move), false)
  solutionIndex.value -= 1
}

/** 切换自动播放，并依次等待每个动作和短暂停顿，直到停止或路线结束。 */
async function toggleAutoPlay(): Promise<void> {
  playing.value = !playing.value
  while (playing.value && solutionIndex.value < solution.value.length) {
    await nextSolutionStep()
    // 步间停顿，给用户留出观察结果和跟随实体魔方的时间。
    await new Promise((resolve) => window.setTimeout(resolve, 400))
  }
  playing.value = false
}

/** 自由练习键盘映射：面字母执行顺时针，Shift 加面字母执行逆时针。 */
function handleKeydown(event: KeyboardEvent): void {
  if (mode.value !== 'practice' || isAnimating.value) return
  // 避免拦截浏览器组合快捷键和输入框内的正常输入。
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  // 统一大小写后识别六个面字母。
  const face = event.key.toUpperCase()
  if (!['U', 'R', 'F', 'D', 'L', 'B'].includes(face)) return
  // 已识别的动作键由应用处理，阻止浏览器默认行为。
  event.preventDefault()
  void performMove(`${face}${event.shiftKey ? "'" : ''}` as MoveToken)
}

// 挂载时注册全局键盘监听，卸载时移除以避免重复处理。
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="app-shell">
    <!-- 品牌、模式切换和项目入口。 -->
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
      <!-- 根据模式显示介绍，并从逻辑状态派生完成提示。 -->
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

      <!-- 左侧负责三维展示与播放，右侧负责颜色录入或快捷键说明。 -->
      <div class="workspace-grid">
        <div class="visual-column">
          <CubeCanvas ref="cubeCanvas" :facelets="facelets" :disabled="isAnimating" />

          <!-- 练习模式的按钮动作统一进入 performMove，保证动画与状态同步。 -->
          <MoveControls
            v-if="mode === 'practice'"
            :disabled="isAnimating"
            :can-undo="history.length > 0"
            @move="performMove"
            @undo="undo"
            @scramble="store.scramble"
            @reset="store.resetSolved"
          />

          <!-- 复原路线存在时展示进度，实际执行动作由父组件协调。 -->
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
          <!-- 录入事件通过仓库修改状态，颜色统计和求解错误由仓库回传。 -->
          <FaceEditor
            v-if="mode === 'editor'"
            :facelets="facelets"
            :selected-color="selectedColor"
            :counts="counts"
            :solving="solving"
            :solve-status="solveStatus"
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
              <p>字母表示转动的面；带 <code>'</code> 表示逆时针；带 <code>2</code> 表示连续转两次 90°，共 180°。</p>
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
