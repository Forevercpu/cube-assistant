import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
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

let solverWorker: Worker | null = null

function getSolverWorker(): Worker {
  if (!solverWorker) {
    solverWorker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return solverWorker
}

function randomScramble(length = 20): MoveToken[] {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const
  const suffixes = ['', "'", '2'] as const
  const result: MoveToken[] = []

  while (result.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)]
    if (result.at(-1)?.startsWith(face)) continue
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    result.push(`${face}${suffix}` as MoveToken)
  }
  return result
}

export const useCubeStore = defineStore('cube', () => {
  const facelets = ref<Facelets>(createSolvedFacelets())
  const history = ref<MoveToken[]>([])
  const solution = ref<MoveToken[]>([])
  const solutionIndex = ref(0)
  const selectedColor = ref<CubeColor>('white')
  const solving = ref(false)
  const solveError = ref('')
  const mode = ref<'practice' | 'editor'>('practice')

  const solved = computed(() => isSolved(facelets.value))
  const counts = computed(() => colorCounts(facelets.value))
  const colorsComplete = computed(() => Object.values(counts.value).every((count) => count === 9))
  const currentSolutionMove = computed(() => solution.value[solutionIndex.value] ?? null)

  function invalidateSolution(): void {
    solution.value = []
    solutionIndex.value = 0
    solveError.value = ''
  }

  function commitMove(move: MoveToken, record = true): Facelets {
    facelets.value = applyMove(facelets.value, move)
    if (record) history.value.push(move)
    return cloneFacelets(facelets.value)
  }

  function takeUndoMove(): MoveToken | null {
    const move = history.value.pop()
    return move ? invertMove(move) : null
  }

  function resetSolved(): void {
    facelets.value = createSolvedFacelets()
    history.value = []
    invalidateSolution()
  }

  function scramble(): MoveToken[] {
    const moves = randomScramble()
    let next = createSolvedFacelets()
    for (const move of moves) next = applyMove(next, move)
    facelets.value = next
    history.value = []
    invalidateSolution()
    return moves
  }

  function setSticker(face: Face, index: number, color: CubeColor): void {
    if (index === 4) return
    const next = cloneFacelets(facelets.value)
    next[face][index] = color
    facelets.value = next
    history.value = []
    invalidateSolution()
  }

  function setMode(nextMode: 'practice' | 'editor'): void {
    mode.value = nextMode
    invalidateSolution()
  }

  function solve(): Promise<MoveToken[]> {
    if (!colorsComplete.value) {
      solveError.value = '每种颜色都需要正好 9 个，请先检查颜色数量。'
      return Promise.reject(new Error(solveError.value))
    }

    solving.value = true
    solveError.value = ''
    const worker = getSolverWorker()

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<SolverResponse>) => {
        worker.removeEventListener('message', handleMessage)
        solving.value = false

        if (event.data.type === 'error') {
          solveError.value = event.data.message
          reject(new Error(event.data.message))
          return
        }

        solution.value = event.data.solution
        solutionIndex.value = 0
        resolve(event.data.solution)
      }

      worker.addEventListener('message', handleMessage)
      worker.postMessage(faceletsToSolverString(facelets.value))
    })
  }

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
    solveError,
    mode,
    solved,
    counts,
    colorsComplete,
    currentSolutionMove,
    commitMove,
    takeUndoMove,
    resetSolved,
    scramble,
    setSticker,
    setMode,
    solve,
    clearSolution,
  }
})

