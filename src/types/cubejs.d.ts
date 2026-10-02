/** 为 cubejs 补充本项目使用的接口；只参与类型检查，不产生运行时代码。 */
declare module 'cubejs' {
  /** cubejs 的块级状态：排列数组记录块编号，朝向数组记录翻转或扭转。 */
  interface CubeData {
    // 六个中心块的排列。
    center: number[]
    // 八个角块的排列（corner permutation）。
    cp: number[]
    // 八个角块的朝向，取值 0、1、2（corner orientation）。
    co: number[]
    // 十二个棱块的排列（edge permutation）。
    ep: number[]
    // 十二个棱块的朝向，取值 0、1（edge orientation）。
    eo: number[]
  }

  /** 外部库的默认导出类；这里声明签名，具体算法由 cubejs 实现。 */
  export default class Cube {
    /** 初始化求解所需的查找表，开销较大，应复用初始化结果。 */
    static initSolver(): void
    /** 读取 URFDLB 顺序的 54 字符色块状态。 */
    static fromString(facelets: string): Cube
    /** 返回整段转动公式的逆公式。 */
    static inverse(algorithm: string): string

    /** 根据块级数据创建魔方；省略参数时创建复原状态。 */
    constructor(data?: CubeData)
    /** 就地执行公式并返回当前实例，支持链式调用。 */
    move(algorithm: string): this
    /** 搜索复原公式，maxDepth 为可选的搜索深度上限。 */
    solve(maxDepth?: number): string
    /** 检查当前魔方是否已复原。 */
    isSolved(): boolean
    /** 导出 URFDLB 顺序的色块字符串。 */
    asString(): string
    /** 导出块排列与朝向，用于物理可达性校验。 */
    toJSON(): CubeData
  }
}

