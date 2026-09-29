import Cube from 'cubejs'
import type { MoveToken, SolverResponse } from '@/types/cube'

let initialized = false

function permutationParity(values: number[]): number {
  let inversions = 0
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left] > values[right]) inversions += 1
    }
  }
  return inversions % 2
}

function validateFacelets(facelets: string): Cube {
  if (facelets.length !== 54) throw new Error('魔方状态必须包含 54 个色块。')

  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    if ([...facelets].filter((value) => value === face).length !== 9) {
      throw new Error('每种颜色都需要正好 9 个，请检查录入内容。')
    }
  }

  if ([4, 13, 22, 31, 40, 49].map((index) => facelets[index]).join('') !== 'URFDLB') {
    throw new Error('中心块方向不正确，请保持白色朝上、绿色朝前。')
  }

  const cube = Cube.fromString(facelets)
  if (cube.asString() !== facelets) {
    throw new Error('存在无法组成的角块或棱块，请检查相邻面的颜色。')
  }
  const { cp, co, ep, eo } = cube.toJSON()
  const cornersValid = [...cp].sort((a, b) => a - b).every((value, index) => value === index)
  const edgesValid = [...ep].sort((a, b) => a - b).every((value, index) => value === index)

  if (!cornersValid || !edgesValid) {
    throw new Error('存在无法组成的角块或棱块，请检查相邻面的颜色。')
  }
  if (co.reduce((sum, value) => sum + value, 0) % 3 !== 0) {
    throw new Error('角块朝向无效，可能有一个角块颜色录反。')
  }
  if (eo.reduce((sum, value) => sum + value, 0) % 2 !== 0) {
    throw new Error('棱块朝向无效，可能有一个棱块颜色录反。')
  }
  if (permutationParity(cp) !== permutationParity(ep)) {
    throw new Error('角块与棱块排列不匹配，这个状态无法通过正常转动复原。')
  }

  return cube
}

self.addEventListener('message', (event: MessageEvent<string>) => {
  try {
    const cube = validateFacelets(event.data)
    if (!initialized) {
      Cube.initSolver()
      initialized = true
    }

    const algorithm = cube.isSolved() ? '' : cube.solve()
    const solution = algorithm
      .trim()
      .split(/\s+/)
      .filter(Boolean) as MoveToken[]
    const response: SolverResponse = { type: 'result', solution }
    self.postMessage(response)
  } catch (error) {
    const response: SolverResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : '求解失败，请检查魔方状态。',
    }
    self.postMessage(response)
  }
})
