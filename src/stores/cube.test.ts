import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { SolverResponse } from '@/types/cube'

class MockWorker extends EventTarget {
  static instances: MockWorker[] = []
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    super()
    MockWorker.instances.push(this)
  }
  respond(data: SolverResponse) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

describe('求解 Worker 状态', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal('Worker', MockWorker)
    MockWorker.instances = []
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('阶段消息保持等待，最终结果结束等待并保存路线', async () => {
    const { useCubeStore } = await import('./cube')
    const store = useCubeStore()
    const promise = store.solve()
    const worker = MockWorker.instances[0]!
    worker.respond({ type: 'progress', stage: 'initializing' })
    expect(store.solving).toBe(true)
    expect(store.solveStatus).toContain('初始化')
    worker.respond({ type: 'result', solution: ['R'] })
    await expect(promise).resolves.toEqual(['R'])
    expect(store.solving).toBe(false)
    expect(store.solution).toEqual(['R'])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('线程加载失败结束等待，重试创建新线程', async () => {
    const { useCubeStore } = await import('./cube')
    const store = useCubeStore()
    const promise = store.solve()
    const rejection = expect(promise).rejects.toThrow('求解器运行失败')
    MockWorker.instances[0]!.dispatchEvent(new Event('error'))
    await rejection
    expect(store.solving).toBe(false)
    expect(store.solveError).toContain('求解器运行失败')
    expect(MockWorker.instances[0]!.terminate).toHaveBeenCalledOnce()
    const retry = store.solve()
    expect(MockWorker.instances).toHaveLength(2)
    MockWorker.instances[1]!.respond({ type: 'result', solution: [] })
    await retry
  })

  it('60 秒无结果终止线程，并展示最后计算阶段', async () => {
    const { useCubeStore } = await import('./cube')
    const store = useCubeStore()
    const promise = store.solve()
    const rejection = expect(promise).rejects.toThrow('超过 60 秒')
    const worker = MockWorker.instances[0]!
    worker.respond({ type: 'progress', stage: 'solving' })
    await vi.advanceTimersByTimeAsync(60_000)
    await rejection
    expect(store.solving).toBe(false)
    expect(store.solveError).toContain('搜索复原路线')
    expect(worker.terminate).toHaveBeenCalledOnce()
    worker.respond({ type: 'result', solution: ['R'] })
    expect(store.solution).toEqual([])
  })
})
