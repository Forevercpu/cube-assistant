// 魔方业务状态仓库；组件通过 ref/computed 读取状态，通过 action 修改状态。
import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import {
  applyMove,
  cloneFacelets,
  colorCounts,
  createSolvedFacelets,
  faceletsToSolverString,
  invertMove,
  isSolved,
} from '@/cube/facelets'
import type {
  CubeColor,
  Face,
  Facelets,
  MoveToken,
  SolverResponse,
} from '@/types/cube'

/** 生成指定长度的随机公式，并排除连续两步转动同一面。 */
function randomScramble(length = 20): MoveToken[] {
  // 随机选择的六个面；as const 保留面字母字面量类型。
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const
  // 可选转动后缀：顺时针、逆时针和半圈。
  const suffixes = ['', "'", '2'] as const
  // 累积生成的打乱动作。
  const result: MoveToken[] = []

  while (result.length < length) {
    // 均匀抽取一个面，若与上一步相同则重新抽取。
    const face = faces[Math.floor(Math.random() * faces.length)]
    if (result.at(-1)?.startsWith(face)) continue
    // 随机选择方向或半圈，再组合成 MoveToken。
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    result.push(`${face}${suffix}` as MoveToken)
  }
  return result
}

/** 每个仓库分别创建色块、操作历史、复原进度和求解线程。 */
function createCubeState() {
  let solverWorker: Worker | null = null

  function getSolverWorker(): Worker {
    if (!solverWorker) {
      solverWorker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
        type: 'module',
      })
    }
    return solverWorker
  }

  // 当前逻辑状态；每次转动或编辑都替换为新对象。
  const facelets = ref<Facelets>(createSolvedFacelets())
  // 记录自由练习动作，撤销时取最后一步的逆操作。
  const history = ref<MoveToken[]>([])
  // 求解器返回的完整复原路线。
  const solution = ref<MoveToken[]>([])
  // 已执行的复原步数，同时也是下一步动作的索引。
  const solutionIndex = ref(0)
  // 录入面板当前选中的画笔颜色。
  const selectedColor = ref<CubeColor>('white')
  // Worker 正在计算时为 true，供界面显示等待状态。
  const solving = ref(false)
  const solveStatus = ref('')
  // 最近一次校验或求解的错误文本。
  const solveError = ref('')

  // 根据当前色块派生是否已复原。
  const solved = computed(() => isSolved(facelets.value))
  // 色块变化后自动重新统计颜色数量。
  const counts = computed(() => colorCounts(facelets.value))
  // 六种颜色各有九格才允许提交求解；物理合法性另由 Worker 检查。
  const colorsComplete = computed(() => Object.values(counts.value).every((count) => count === 9))
  // 当前待执行的动作，路线结束或尚未求解时返回 null。
  const currentSolutionMove = computed(() => solution.value[solutionIndex.value] ?? null)

  /** 色块状态变化后清空旧路线、进度与错误，防止使用过期结果。 */
  function invalidateSolution(): void {
    solution.value = []
    solutionIndex.value = 0
    solveError.value = ''
  }

  /** 提交一次逻辑转动；record 决定是否加入撤销历史，并返回独立状态快照。 */
  function commitMove(move: MoveToken, record = true): Facelets {
    facelets.value = applyMove(facelets.value, move)
    if (record) history.value.push(move)
    return cloneFacelets(facelets.value)
  }

  /** 直接切到指定待执行步骤，统一提交状态，避免逐步播放动画。 */
  function seekSolutionStep(targetIndex: number): void {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > solution.value.length) return
    if (targetIndex === solutionIndex.value) return

    let next = cloneFacelets(facelets.value)
    for (let index = solutionIndex.value; index < targetIndex; index += 1) {
      next = applyMove(next, solution.value[index]!)
    }
    for (let index = solutionIndex.value; index > targetIndex; index -= 1) {
      next = applyMove(next, invertMove(solution.value[index - 1]!))
    }
    facelets.value = next
    solutionIndex.value = targetIndex
  }

  /** 弹出最近的练习动作并返回逆操作；实际转动由页面统一播放。 */
  function takeUndoMove(): MoveToken | null {
    // 取走最后一条历史，没有记录时返回 undefined。
    const move = history.value.pop()
    return move ? invertMove(move) : null
  }

  /** 恢复标准复原状态，并清除历史及求解路线。 */
  function resetSolved(): void {
    facelets.value = createSolvedFacelets()
    history.value = []
    invalidateSolution()
  }

  /** 从复原状态执行随机公式，直接更新逻辑状态并返回打乱动作。 */
  function scramble(): MoveToken[] {
    // 本次生成的随机公式。
    const moves = randomScramble()
    // 逐步累计的临时状态，不依赖打乱前的魔方。
    let next = createSolvedFacelets()
    for (const move of moves) next = applyMove(next, move)
    facelets.value = next
    history.value = []
    invalidateSolution()
    return moves
  }

  /** 编辑单格颜色；中心格固定，以维持录入方向和求解器配色约定。 */
  function setSticker(face: Face, index: number, color: CubeColor): void {
    if (index === 4) return
    // 先复制六面数组，再修改指定格，避免直接改动旧状态。
    const next = cloneFacelets(facelets.value)
    next[face][index] = color
    facelets.value = next
    history.value = []
    invalidateSolution()
  }

  /** 先检查颜色数量，再将快照交给 Worker；用 Promise 返回异步复原动作。 */
  function solve(): Promise<MoveToken[]> {
    if (solving.value) return Promise.reject(new Error('正在求解，请等待本次计算完成。'))
    if (!colorsComplete.value) {
      solveError.value = '每种颜色都需要正好 9 个，请先检查颜色数量。'
      return Promise.reject(new Error(solveError.value))
    }

    solving.value = true
    solveStatus.value = '正在启动求解器…'
    solveError.value = ''
    // 获取可复用的后台求解线程。
    let worker: Worker
    try {
      worker = getSolverWorker()
    } catch (error) {
      solving.value = false
      solveStatus.value = ''
      solveError.value = error instanceof Error ? error.message : '求解器启动失败，请重试。'
      return Promise.reject(new Error(solveError.value))
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout)
        worker.removeEventListener('message', handleMessage)
        worker.removeEventListener('error', handleError)
        worker.removeEventListener('messageerror', handleMessageError)
        solving.value = false
        solveStatus.value = ''
      }
      const fail = (message: string) => {
        cleanup()
        worker.terminate()
        solverWorker = null
        solveError.value = message
        reject(new Error(message))
      }
      const handleError = (event: ErrorEvent) => {
        fail(`求解器运行失败：${event.message || '线程加载失败，请查看浏览器 Console 并重试。'}`)
      }
      const handleMessageError = () => fail('无法读取求解器消息，请重试。')
      // 主线程负责超时，Worker 即使被同步计算占满也可以被终止。
      const timeout = setTimeout(() => {
        fail(`求解超过 60 秒，已停止计算。最后阶段：${solveStatus.value} 请重试或查看浏览器 Console。`)
      }, 60_000)
      // 单次响应处理器；MessageEvent 的泛型约束成功/失败消息格式。
      const handleMessage = (event: MessageEvent<SolverResponse>) => {
        if (event.data.type === 'progress') {
          solveStatus.value = {
            validating: '正在检查魔方状态…',
            initializing: '首次初始化求解表，可能需要几秒…',
            solving: '正在搜索复原路线…',
          }[event.data.stage]
          return
        }
        // 响应后移除本次监听器，避免后续求解重复触发旧回调。
        cleanup()

        // 按可辨识联合字段收窄类型，并把 Worker 错误传给调用者。
        if (event.data.type === 'error') {
          solveError.value = event.data.message
          reject(new Error(event.data.message))
          return
        }

        solution.value = event.data.solution
        solutionIndex.value = 0
        resolve(event.data.solution)
      }

      // 先注册监听再发送状态，确保能接收本次结果。
      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      worker.addEventListener('messageerror', handleMessageError)
      try {
        worker.postMessage(faceletsToSolverString(facelets.value))
      } catch (error) {
        fail(error instanceof Error ? error.message : '无法发送魔方状态，请重试。')
      }
    })
  }

  /** 对外提供主动清除复原路线的入口。 */
  function clearSolution(): void {
    invalidateSolution()
  }

  return {
    facelets,
    history,
    solution,
    solutionIndex,
    selectedColor,
    solving,
    solveStatus,
    solveError,
    solved,
    counts,
    colorsComplete,
    currentSolutionMove,
    commitMove,
    seekSolutionStep,
    takeUndoMove,
    resetSolved,
    scramble,
    setSticker,
    solve,
    clearSolution,
  }
}

export const useCubeStore = defineStore('cube', createCubeState)
export const useRestoreCubeStore = defineStore('restore-cube', createCubeState)

// 保存代码时保留当前录入、复原路线及进度，避免热更新重置为已复原状态。
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCubeStore, import.meta.hot))
  import.meta.hot.accept(acceptHMRUpdate(useRestoreCubeStore, import.meta.hot))
}
