// 后台求解入口，耗时搜索不占用 Vue 与 Three.js 所在的主线程。
import Cube from 'cubejs'
import type { MoveToken, SolverResponse } from '@/types/cube'

// 此 Worker 是否已初始化 cubejs 查找表，避免重复执行昂贵的初始化。
let initialized = false

/**
 * 用逆序对个数计算排列奇偶性。
 * @param values 按位置排列的块编号。
 * @returns 偶排列返回 0，奇排列返回 1。
 */
function permutationParity(values: number[]): number {
  // 累计顺序相反的元素对数。
  let inversions = 0
  // 比较每一对不同位置的元素，统计前大后小的逆序对。
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left] > values[right]) inversions += 1
    }
  }
  return inversions % 2
}

/** 校验格式、块组成与物理可达性，通过后返回可求解的 cubejs 实例。 */
function validateFacelets(facelets: string): Cube {
  if (facelets.length !== 54) throw new Error('魔方状态必须包含 54 个色块。')

  // 检查六种面字母各出现九次；与总长度一起排除额外字符。
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    if ([...facelets].filter((value) => value === face).length !== 9) {
      throw new Error('每种颜色都需要正好 9 个，请检查录入内容。')
    }
  }

  // 每隔九格的中心必须依次为 URFDLB，确保统一的魔方朝向。
  if ([4, 13, 22, 31, 40, 49].map((index) => facelets[index]).join('') !== 'URFDLB') {
    throw new Error('中心块方向不正确，请保持白色朝上、绿色朝前。')
  }

  // 将面色块转换为角块/棱块的排列与朝向表示。
  const cube = Cube.fromString(facelets)
  // 转换后再序列化应完全一致，否则存在无法识别的块组合。
  if (cube.asString() !== facelets) {
    throw new Error('存在无法组成的角块或棱块，请检查相邻面的颜色。')
  }
  // cp/ep 为排列，co/eo 为朝向，分别用于以下物理约束。
  const { cp, co, ep, eo } = cube.toJSON()
  // 排序副本后检查编号连续，确认八个角块各出现一次。
  const cornersValid = [...cp].sort((a, b) => a - b).every((value, index) => value === index)
  // 确认十二个棱块各出现一次；复制后排序避免改动库实例。
  const edgesValid = [...ep].sort((a, b) => a - b).every((value, index) => value === index)

  if (!cornersValid || !edgesValid) {
    throw new Error('存在无法组成的角块或棱块，请检查相邻面的颜色。')
  }
  // 合法转动保持角块扭转总和模 3 为零。
  if (co.reduce((sum, value) => sum + value, 0) % 3 !== 0) {
    throw new Error('角块朝向无效，可能有一个角块颜色录反。')
  }
  // 合法转动保持棱块翻转总和模 2 为零。
  if (eo.reduce((sum, value) => sum + value, 0) % 2 !== 0) {
    throw new Error('棱块朝向无效，可能有一个棱块颜色录反。')
  }
  // 角块与棱块的排列奇偶性必须相同，单独交换两个块不可达。
  if (permutationParity(cp) !== permutationParity(ep)) {
    throw new Error('角块与棱块排列不匹配，这个状态无法通过正常转动复原。')
  }

  return cube
}

/** 接收主线程发来的状态字符串，在后台完成校验与求解后回传结果。 */
self.addEventListener('message', (event: MessageEvent<string>) => {
  try {
    self.postMessage({ type: 'progress', stage: 'validating' } satisfies SolverResponse)
    // 无效状态先报错，避免进入耗时搜索。
    const cube = validateFacelets(event.data)
    // 查找表只在首个合法请求时初始化，后续请求直接复用。
    if (!initialized) {
      self.postMessage({ type: 'progress', stage: 'initializing' } satisfies SolverResponse)
      Cube.initSolver()
      initialized = true
    }

    // 已复原时直接返回空公式，否则调用 Two-Phase 求解。
    self.postMessage({ type: 'progress', stage: 'solving' } satisfies SolverResponse)
    const algorithm = cube.isSolved() ? '' : cube.solve()
    // 按空白拆分公式并过滤空项，空公式应得到空数组。
    const solution = algorithm
      .trim()
      .split(/\s+/)
      .filter(Boolean) as MoveToken[]
    // 以共享类型构造成功响应。
    const response: SolverResponse = { type: 'result', solution }
    self.postMessage(response)
  } catch (error) {
    // 将校验、初始化或求解异常统一转换为可显示的失败消息。
    // 失败响应沿用同一协议，主线程可通过 type 区分处理分支。
    const response: SolverResponse = {
      type: 'error',
      // 保留 Error 的具体文本；非 Error 异常使用默认提示。
      message: error instanceof Error ? error.message : '求解失败，请检查魔方状态。',
    }
    self.postMessage(response)
  }
})
