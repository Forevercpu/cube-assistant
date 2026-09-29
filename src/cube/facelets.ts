import type {
  CubeColor,
  Face,
  Facelets,
  MoveDefinition,
  MoveToken,
} from '@/types/cube'
import { FACES } from '@/types/cube'

export const FACE_COLOR: Record<Face, CubeColor> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
}

export const COLOR_HEX: Record<CubeColor, number> = {
  white: 0xf7f7f2,
  red: 0xe7433b,
  green: 0x36b46b,
  yellow: 0xffd84d,
  orange: 0xff8a34,
  blue: 0x3787f2,
}

export const COLOR_LABEL: Record<CubeColor, string> = {
  white: '白色',
  red: '红色',
  green: '绿色',
  yellow: '黄色',
  orange: '橙色',
  blue: '蓝色',
}

export const FACE_LABEL: Record<Face, string> = {
  U: '上面',
  R: '右面',
  F: '前面',
  D: '下面',
  L: '左面',
  B: '后面',
}

export const MOVE_DEFINITIONS: Record<Face, MoveDefinition> = {
  U: { axis: 'y', layer: 1, quarter: -1 },
  R: { axis: 'x', layer: 1, quarter: -1 },
  F: { axis: 'z', layer: 1, quarter: -1 },
  D: { axis: 'y', layer: -1, quarter: 1 },
  L: { axis: 'x', layer: -1, quarter: 1 },
  B: { axis: 'z', layer: -1, quarter: 1 },
}

export interface Vec3Int {
  x: number
  y: number
  z: number
}

export interface FaceletDescriptor {
  face: Face
  index: number
  offset: number
  position: Vec3Int
  normal: Vec3Int
}

export function createSolvedFacelets(): Facelets {
  return Object.fromEntries(
    FACES.map((face) => [face, Array<CubeColor>(9).fill(FACE_COLOR[face])]),
  ) as Facelets
}

export function cloneFacelets(facelets: Facelets): Facelets {
  return Object.fromEntries(
    FACES.map((face) => [face, [...facelets[face]]]),
  ) as Facelets
}

function faceletSpatial(face: Face, index: number): Pick<FaceletDescriptor, 'position' | 'normal'> {
  const row = Math.floor(index / 3)
  const col = index % 3
  const across = col - 1
  const down = row - 1

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

export const FACELET_DESCRIPTORS: FaceletDescriptor[] = FACES.flatMap((face, faceIndex) =>
  Array.from({ length: 9 }, (_, index) => ({
    face,
    index,
    offset: faceIndex * 9 + index,
    ...faceletSpatial(face, index),
  })),
)

function vectorKey(position: Vec3Int, normal: Vec3Int): string {
  return `${position.x},${position.y},${position.z}|${normal.x},${normal.y},${normal.z}`
}

const SLOT_BY_VECTOR = new Map(
  FACELET_DESCRIPTORS.map((slot) => [vectorKey(slot.position, slot.normal), slot.offset]),
)

function rotateQuarter(vector: Vec3Int, axis: MoveDefinition['axis'], quarter: -1 | 1): Vec3Int {
  const { x, y, z } = vector

  if (axis === 'x') {
    return quarter === 1 ? { x, y: -z, z: y } : { x, y: z, z: -y }
  }
  if (axis === 'y') {
    return quarter === 1 ? { x: z, y, z: -x } : { x: -z, y, z: x }
  }
  return quarter === 1 ? { x: -y, y: x, z } : { x: y, y: -x, z }
}

export function parseMove(move: MoveToken): {
  definition: MoveDefinition
  repeats: number
  angle: number
} {
  const face = move[0] as Face
  const suffix = move.slice(1)
  const definition = MOVE_DEFINITIONS[face]
  const repeats = suffix === '2' ? 2 : suffix === "'" ? 3 : 1
  const direction = suffix === "'" ? -1 : 1
  const magnitude = suffix === '2' ? Math.PI : Math.PI / 2

  return {
    definition,
    repeats,
    angle: definition.quarter * direction * magnitude,
  }
}

export function applyMove(facelets: Facelets, move: MoveToken): Facelets {
  let source = FACES.flatMap((face) => facelets[face])
  const { definition, repeats } = parseMove(move)

  for (let turn = 0; turn < repeats; turn += 1) {
    const target = [...source]

    for (const slot of FACELET_DESCRIPTORS) {
      if (slot.position[definition.axis] !== definition.layer) continue

      const position = rotateQuarter(slot.position, definition.axis, definition.quarter)
      const normal = rotateQuarter(slot.normal, definition.axis, definition.quarter)
      const targetOffset = SLOT_BY_VECTOR.get(vectorKey(position, normal))

      if (targetOffset === undefined) {
        throw new Error(`无法映射魔方色块：${move}`)
      }
      target[targetOffset] = source[slot.offset]
    }
    source = target
  }

  return Object.fromEntries(
    FACES.map((face, faceIndex) => [face, source.slice(faceIndex * 9, faceIndex * 9 + 9)]),
  ) as Facelets
}

export function invertMove(move: MoveToken): MoveToken {
  if (move.endsWith('2')) return move
  return move.endsWith("'") ? (move[0] as MoveToken) : (`${move}'` as MoveToken)
}

export function faceletsToSolverString(facelets: Facelets): string {
  const colorToFace = Object.fromEntries(
    Object.entries(FACE_COLOR).map(([face, color]) => [color, face]),
  ) as Record<CubeColor, Face>

  return FACES.flatMap((face) => facelets[face].map((color) => colorToFace[color])).join('')
}

export function isSolved(facelets: Facelets): boolean {
  return FACES.every((face) => facelets[face].every((color) => color === facelets[face][4]))
}

export function colorCounts(facelets: Facelets): Record<CubeColor, number> {
  const counts: Record<CubeColor, number> = {
    white: 0,
    red: 0,
    green: 0,
    yellow: 0,
    orange: 0,
    blue: 0,
  }

  for (const face of FACES) {
    for (const color of facelets[face]) counts[color] += 1
  }
  return counts
}

export function moveDescription(move: MoveToken): string {
  const face = move[0] as Face
  const suffix = move.slice(1)
  const action = suffix === '2' ? '旋转 180°' : suffix === "'" ? '逆时针旋转 90°' : '顺时针旋转 90°'
  return `${FACE_LABEL[face]}${action}`
}

