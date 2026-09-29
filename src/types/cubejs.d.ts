declare module 'cubejs' {
  interface CubeData {
    center: number[]
    cp: number[]
    co: number[]
    ep: number[]
    eo: number[]
  }

  export default class Cube {
    static initSolver(): void
    static fromString(facelets: string): Cube
    static inverse(algorithm: string): string

    constructor(data?: CubeData)
    move(algorithm: string): this
    solve(maxDepth?: number): string
    isSolved(): boolean
    asString(): string
    toJSON(): CubeData
  }
}

