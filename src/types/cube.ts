// 魔方业务共享类型，供组件、状态仓库和 Worker 使用。
/** 求解器采用的固定面顺序；as const 保留字面量，便于派生联合类型。 */
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const

/** 从只读元组提取元素类型：上、右、前、下、左、后六面。 */
export type Face = (typeof FACES)[number]
/** 色块允许使用的六种颜色名称。 */
export type CubeColor = 'white' | 'red' | 'green' | 'yellow' | 'orange' | 'blue'
/** 每个面对应九个颜色，按面向该面的视角从左到右、从上到下排列。 */
export type Facelets = Record<Face, CubeColor[]>
/** 空后缀为顺时针 90°，单引号为逆时针 90°，2 为 180°。 */
export type MoveSuffix = '' | "'" | '2'
/** 模板字面量类型将面字母与后缀组合，约束合法转动记号。 */
export type MoveToken = `${Face}${MoveSuffix}`

/** 一次顺时针转层在三维坐标中的定义。 */
export interface MoveDefinition {
  // 旋转轴：x 向右，y 向上，z 向前。
  axis: 'x' | 'y' | 'z'
  // 轴上被选中的外层坐标，中心层不参与标准面转动。
  layer: -1 | 1
  // 按右手坐标系旋转的正负方向，每次旋转四分之一圈。
  quarter: -1 | 1
}

/** Worker 求解成功消息，以 type 字段区分响应分支。 */
export interface SolveResult {
  // 成功消息的字面量标识。
  type: 'result'
  // 按执行顺序排列的复原动作；已复原时为空数组。
  solution: MoveToken[]
}

/** Worker 校验或求解失败时返回的消息。 */
export interface SolveError {
  // 失败消息的字面量标识。
  type: 'error'
  // 可直接展示给用户的失败原因。
  message: string
}

/** 可辨识联合类型：检查 type 后，TS 可推断相应响应字段。 */
export type SolverResponse = SolveResult | SolveError | {
  type: 'progress'
  stage: 'validating' | 'initializing' | 'solving'
}
