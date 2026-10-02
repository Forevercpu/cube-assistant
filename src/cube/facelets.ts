// 魔方的纯逻辑层：颜色、空间坐标与转动置换，不依赖 Three.js 或页面状态。
import type {
  CubeColor,
  Face,
  Facelets,
  MoveDefinition,
  MoveToken,
} from '@/types/cube'
import { FACES } from '@/types/cube'

/** 固定中心配色；Record<Face, CubeColor> 要求六个面键齐全且值为合法颜色。 */
export const FACE_COLOR: Record<Face, CubeColor> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
}

/** 数值形式的 RGB 颜色，供 Three.js 材质与页面色块共用。 */
// 按实体魔方采用浅色配色；保留标准颜色键，粉色对应 red，肉色对应 orange。
// 粉色偏冷、肉色偏暖，避免录入时混淆这两种相近的颜色。
export const COLOR_HEX: Record<CubeColor, number> = {
  white: 0xf4f3eb,
  red: 0xe6a9bf,
  green: 0x78cbb2,
  yellow: 0xf4eda0,
  orange: 0xf1bea3,
  blue: 0x80c8df,
}

/** 颜色名称的中文显示文本。 */
export const COLOR_LABEL: Record<CubeColor, string> = {
  white: '白色',
  red: '粉色',
  green: '绿色',
  yellow: '黄色',
  orange: '肉色',
  blue: '蓝色',
}

/** 标准面字母对应的中文方位。 */
export const FACE_LABEL: Record<Face, string> = {
  U: '上面',
  R: '右面',
  F: '前面',
  D: '下面',
  L: '左面',
  B: '后面',
}

/** 从各面外侧观察的顺时针转动，换算为右手坐标系的旋转轴与符号。 */
export const MOVE_DEFINITIONS: Record<Face, MoveDefinition> = {
  U: { axis: 'y', layer: 1, quarter: -1 },
  R: { axis: 'x', layer: 1, quarter: -1 },
  F: { axis: 'z', layer: 1, quarter: -1 },
  D: { axis: 'y', layer: -1, quarter: 1 },
  L: { axis: 'x', layer: -1, quarter: 1 },
  B: { axis: 'z', layer: -1, quarter: 1 },
}

/** 离散三维向量；色块坐标与法线的分量均在 -1、0、1 中取值。 */
export interface Vec3Int {
  // 左右方向的分量，正值向右。
  x: number
  // 上下方向的分量，正值向上。
  y: number
  // 前后方向的分量，正值向前。
  z: number
}

/** 一个色块在二维面数组、扁平数组和三维模型中的位置描述。 */
export interface FaceletDescriptor {
  // 色块所在的面。
  face: Face
  // 面内索引 0～8，中心索引为 4。
  index: number
  // URFDLB 顺序中对应的全局索引 0～53。
  offset: number
  // 色块所属小方块的离散坐标。
  position: Vec3Int
  // 色块朝外的单位法线，用于区别同一小方块上的多个贴纸。
  normal: Vec3Int
}

/** 创建独立的复原状态：每面九格均为该面的中心颜色。 */
export function createSolvedFacelets(): Facelets {
  // 每个面都创建独立数组；fromEntries 的通用返回类型用断言收窄为 Facelets。
  return Object.fromEntries(
    FACES.map((face) => [face, Array<CubeColor>(9).fill(FACE_COLOR[face])]),
  ) as Facelets
}

/** 逐面复制数组，避免编辑或动画快照与原状态共享可变数组。 */
export function cloneFacelets(facelets: Facelets): Facelets {
  return Object.fromEntries(
    FACES.map((face) => [face, [...facelets[face]]]),
  ) as Facelets
}

/**
 * 将二维索引转换为三维位置与朝向；各面均按从外侧正视的顺序读取。
 * @param face 标准面字母。
 * @param index 面内按行排列的索引 0～8。
 * @returns Pick 仅保留 FaceletDescriptor 的 position 与 normal 两个字段。
 */
function faceletSpatial(face: Face, index: number): Pick<FaceletDescriptor, 'position' | 'normal'> {
  // 九宫格的行号 0～2。
  const row = Math.floor(index / 3)
  // 九宫格的列号 0～2。
  const col = index % 3
  // 将列号平移为相对中心的水平坐标 -1～1。
  const across = col - 1
  // 将行号平移为相对中心的向下坐标 -1～1。
  const down = row - 1

  // 背面与左右面的符号差异保证二维观察方向与三维方向一致。
  switch (face) {
    case 'U':
      return { position: { x: across, y: 1, z: down }, normal: { x: 0, y: 1, z: 0 } }
    case 'R':
      return { position: { x: 1, y: -down, z: -across }, normal: { x: 1, y: 0, z: 0 } }
    case 'F':
      return { position: { x: across, y: -down, z: 1 }, normal: { x: 0, y: 0, z: 1 } }
    case 'D':
      return { position: { x: across, y: -1, z: -down }, normal: { x: 0, y: -1, z: 0 } }
    case 'L':
      return { position: { x: -1, y: -down, z: across }, normal: { x: -1, y: 0, z: 0 } }
    case 'B':
      return { position: { x: -across, y: -down, z: -1 }, normal: { x: 0, y: 0, z: -1 } }
  }
}

/** 预计算全部 54 格的空间描述，转层逻辑和贴纸渲染共用同一套坐标。 */
export const FACELET_DESCRIPTORS: FaceletDescriptor[] = FACES.flatMap((face, faceIndex) =>
  Array.from({ length: 9 }, (_, index) => ({
    face,
    index,
    offset: faceIndex * 9 + index,
    ...faceletSpatial(face, index),
  })),
)

/** 将位置与法线编码为唯一键；仅有位置无法区分角块的三张贴纸。 */
function vectorKey(position: Vec3Int, normal: Vec3Int): string {
  return `${position.x},${position.y},${position.z}|${normal.x},${normal.y},${normal.z}`
}

// 空间键到全局索引的反查表，避免每次旋转都扫描 54 格。
const SLOT_BY_VECTOR = new Map(
  FACELET_DESCRIPTORS.map((slot) => [vectorKey(slot.position, slot.normal), slot.offset]),
)

/**
 * 按右手坐标系旋转 ±90°，用整数交换与取反避免浮点误差。
 * MoveDefinition['axis'] 通过索引访问类型复用已有的轴约束。
 * @param vector 需要旋转的位置或法线。
 * @param axis 旋转轴，轴自身的分量保持不变。
 * @param quarter 正负方向：1 为右手正向，-1 为反向。
 */
function rotateQuarter(vector: Vec3Int, axis: MoveDefinition['axis'], quarter: -1 | 1): Vec3Int {
  // 保存旋转前的分量，按指定轴计算旋转后的向量。
  const { x, y, z } = vector

  if (axis === 'x') {
    return quarter === 1 ? { x, y: -z, z: y } : { x, y: z, z: -y }
  }
  if (axis === 'y') {
    return quarter === 1 ? { x: z, y, z: -x } : { x: -z, y, z: x }
  }
  return quarter === 1 ? { x: -y, y: x, z } : { x: y, y: -x, z }
}

/** 解析动作，分别给离散状态置换和连续动画提供重复次数与弧度。 */
export function parseMove(move: MoveToken): {
  // 对应面的一次顺时针转层定义。
  definition: MoveDefinition
  // 以顺时针 90° 为单位的重复次数。
  repeats: number
  // 动画使用的带方向旋转弧度。
  angle: number
} {
  // 首字符是标准面字母；MoveToken 类型已限制合法取值。
  const face = move[0] as Face
  // 后续字符指定逆时针或半圈，空字符串表示顺时针。
  const suffix = move.slice(1)
  // 查找该面的旋转轴、层坐标和基础方向。
  const definition = MOVE_DEFINITIONS[face]
  // 逆时针等价于顺时针三次，半圈等价于两次。
  const repeats = suffix === '2' ? 2 : suffix === "'" ? 3 : 1
  // 动画直接反转方向，无需把逆时针绘制成 270°。
  const direction = suffix === "'" ? -1 : 1
  // 半圈为 π，其余为 π/2，单位均为弧度。
  const magnitude = suffix === '2' ? Math.PI : Math.PI / 2

  return {
    definition,
    repeats,
    angle: definition.quarter * direction * magnitude,
  }
}

/**
 * 返回转动后的新状态，不修改输入；只置换指定外层上的色块。
 * @param facelets 转动前的六面颜色。
 * @param move 要执行的面转动，可带逆时针或半圈后缀。
 * @returns 按原有 URFDLB 顺序重新组装的状态。
 */
export function applyMove(facelets: Facelets, move: MoveToken): Facelets {
  // 按固定面顺序展开为 54 格，作为当前四分之一圈的输入。
  let source = FACES.flatMap((face) => facelets[face])
  // 解析本次需要选择的层以及基础转动的次数。
  const { definition, repeats } = parseMove(move)

  // 依次执行 1、2 或 3 次基础旋转，实现全部标准动作。
  for (let turn = 0; turn < repeats; turn += 1) {
    // 从原状态复制目标数组，未参与转动的色块保持原值。
    const target = [...source]

    // 遍历色块空间描述，只处理旋转轴坐标等于目标层的色块。
    for (const slot of FACELET_DESCRIPTORS) {
      if (slot.position[definition.axis] !== definition.layer) continue

      // 旋转色块所属小方块的位置。
      const position = rotateQuarter(slot.position, definition.axis, definition.quarter)
      // 同时旋转法线，确定贴纸转动后朝向哪个面。
      const normal = rotateQuarter(slot.normal, definition.axis, definition.quarter)
      // 使用旋转后的空间键定位目标数组下标。
      const targetOffset = SLOT_BY_VECTOR.get(vectorKey(position, normal))

      if (targetOffset === undefined) {
        throw new Error(`无法映射魔方色块：${move}`)
      }
      // 从 source 读取、向 target 写入，避免原地覆盖影响后续色块。
      target[targetOffset] = source[slot.offset]
    }
    // 本轮置换结束，新状态作为下一轮基础旋转的输入。
    source = target
  }

  // 将扁平数组每九格切回一个面，恢复页面与仓库使用的数据结构。
  return Object.fromEntries(
    FACES.map((face, faceIndex) => [face, source.slice(faceIndex * 9, faceIndex * 9 + 9)]),
  ) as Facelets
}

/** 计算单步逆操作；180° 的逆操作仍是自身。 */
export function invertMove(move: MoveToken): MoveToken {
  if (move.endsWith('2')) return move
  return move.endsWith("'") ? (move[0] as MoveToken) : (`${move}'` as MoveToken)
}

/** 将颜色名称转换为 cubejs 所需的 54 个面字母。 */
export function faceletsToSolverString(facelets: Facelets): string {
  // 反转固定中心配色表，建立颜色到标准面字母的映射。
  const colorToFace = Object.fromEntries(
    Object.entries(FACE_COLOR).map(([face, color]) => [color, face]),
  ) as Record<CubeColor, Face>

  return FACES.flatMap((face) => facelets[face].map((color) => colorToFace[color])).join('')
}

/** 检查各面九格是否均等于该面的中心色；不替代物理合法性校验。 */
export function isSolved(facelets: Facelets): boolean {
  return FACES.every((face) => facelets[face].every((color) => color === facelets[face][4]))
}

/** 统计六种颜色出现的次数，供录入提示和求解前的初步检查使用。 */
export function colorCounts(facelets: Facelets): Record<CubeColor, number> {
  // 从零开始累加，保证返回记录始终包含六种颜色。
  const counts: Record<CubeColor, number> = {
    white: 0,
    red: 0,
    green: 0,
    yellow: 0,
    orange: 0,
    blue: 0,
  }

  // 遍历全部六面，将每个色块计入相应颜色。
  for (const face of FACES) {
    for (const color of facelets[face]) counts[color] += 1
  }
  return counts
}

/** 把标准动作记号转换为面名称与转动角度的中文说明。 */
export function moveDescription(move: MoveToken): string {
  // 面字母决定中文方位名称。
  const face = move[0] as Face
  // 后缀决定方向和角度。
  const suffix = move.slice(1)
  // 根据动作后缀选择半圈、逆时针或顺时针说明。
  const action = suffix === '2' ? '顺时针转两次 90°（共 180°）' : suffix === "'" ? '逆时针旋转 90°' : '顺时针旋转 90°'
  return `${FACE_LABEL[face]}${action}`
}
