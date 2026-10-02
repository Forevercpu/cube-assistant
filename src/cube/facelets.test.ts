// 现有魔方逻辑回归测试，不涉及 DOM 或 WebGL。
import { beforeAll, describe, expect, it } from 'vitest'
import Cube from 'cubejs'
import {
  applyMove,
  createSolvedFacelets,
  faceletsToSolverString,
  invertMove,
  isSolved,
} from '@/cube/facelets'
import type { MoveToken } from '@/types/cube'

// 验证纯逻辑转层可逆，并与实际 cubejs 求解公式兼容。
describe('魔方色块状态', () => {
  // 整组测试复用求解查找表，初始化允许最多 20 秒。
  beforeAll(() => {
    Cube.initSolver()
  }, 20_000)

  // 参数化覆盖六面的基础动作，检查动作加逆动作能恢复原状态。
  it.each<MoveToken>(['U', 'R', 'F', 'D', 'L', 'B'])(
    '%s 转动后执行逆操作应回到完成状态',
    (move) => {
      // 执行一次基础转层后的状态。
      const moved = applyMove(createSolvedFacelets(), move)
      // 再执行逆动作，预期每个面重新成为单色。
      const restored = applyMove(moved, invertMove(move))
      expect(isSolved(restored)).toBe(true)
    },
  )

  it('自定义转层坐标应与 cubejs 求解结果保持一致', () => {
    // 固定打乱序列覆盖六面、逆时针与半圈，确保结果可重复。
    const scramble: MoveToken[] = ['R', 'U', "F'", 'L2', 'D', "B'", 'R2', 'U2']
    // 累计打乱与后续复原的测试状态。
    let state = createSolvedFacelets()
    for (const move of scramble) state = applyMove(state, move)

    // 用自定义转层产生的状态构造 cubejs 实例。
    const cube = Cube.fromString(faceletsToSolverString(state))
    // 将库的求解公式拆成动作，再由自定义逻辑执行以检查两者坐标约定。
    const solution = cube.solve().trim().split(/\s+/).filter(Boolean) as MoveToken[]
    for (const move of solution) state = applyMove(state, move)

    expect(isSolved(state)).toBe(true)
  })
})
