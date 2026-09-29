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

describe('魔方色块状态', () => {
  beforeAll(() => {
    Cube.initSolver()
  }, 20_000)

  it.each<MoveToken>(['U', 'R', 'F', 'D', 'L', 'B'])(
    '%s 转动后执行逆操作应回到完成状态',
    (move) => {
      const moved = applyMove(createSolvedFacelets(), move)
      const restored = applyMove(moved, invertMove(move))
      expect(isSolved(restored)).toBe(true)
    },
  )

  it('自定义转层坐标应与 cubejs 求解结果保持一致', () => {
    const scramble: MoveToken[] = ['R', 'U', "F'", 'L2', 'D', "B'", 'R2', 'U2']
    let state = createSolvedFacelets()
    for (const move of scramble) state = applyMove(state, move)

    const cube = Cube.fromString(faceletsToSolverString(state))
    const solution = cube.solve().trim().split(/\s+/).filter(Boolean) as MoveToken[]
    for (const move of solution) state = applyMove(state, move)

    expect(isSolved(state)).toBe(true)
  })
})
