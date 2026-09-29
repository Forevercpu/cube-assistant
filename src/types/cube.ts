export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const

export type Face = (typeof FACES)[number]
export type CubeColor = 'white' | 'red' | 'green' | 'yellow' | 'orange' | 'blue'
export type Facelets = Record<Face, CubeColor[]>
export type MoveSuffix = '' | "'" | '2'
export type MoveToken = `${Face}${MoveSuffix}`

export interface MoveDefinition {
  axis: 'x' | 'y' | 'z'
  layer: -1 | 1
  quarter: -1 | 1
}

export interface SolveResult {
  type: 'result'
  solution: MoveToken[]
}

export interface SolveError {
  type: 'error'
  message: string
}

export type SolverResponse = SolveResult | SolveError

