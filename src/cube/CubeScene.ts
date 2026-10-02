// Three.js 展示层；颜色状态由外部传入，场景本身不承担魔方求解。
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  COLOR_HEX,
  FACELET_DESCRIPTORS,
  parseMove,
} from '@/cube/facelets'
import type { CubeColor, Facelets, MoveToken } from '@/types/cube'

// 相邻小方块中心的距离，略大于边长以形成转层缝隙。
const CUBIE_SPACING = 1
// 黑色小方块主体的边长，单位为场景坐标单位。
const CUBIE_SIZE = 0.96
// 方形贴纸边长，小于主体以露出黑色边框。
const STICKER_SIZE = 0.9

/** 将离散小方块坐标编码为 Map 键，供贴纸定位所属小方块。 */
function coordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

/** 封装三维场景、视角控制、转层动画及 GPU 资源生命周期。 */
export class CubeScene {
  // 画布挂载节点，也是计算渲染尺寸的来源。
  private readonly container: HTMLElement
  // Three.js 场景，容纳魔方根节点与灯光。
  private readonly scene = new THREE.Scene()
  // 透视相机：视角 36°，初始宽高比 1，裁剪距离 0.1～100。
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  // WebGL 渲染器，在构造函数内创建并挂载。
  private readonly renderer: THREE.WebGLRenderer
  // 鼠标轨道控制器，用于绕魔方旋转视角与缩放。
  private readonly controls: OrbitControls
  // 魔方所有小方块和临时旋转枢轴的共同父节点。
  private readonly cubeRoot = new THREE.Group()
  // 全部小方块共享的立方体几何体，避免重复分配。
  private readonly cubieGeometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
  // 全部贴纸共享的平面几何体。
  private readonly stickerGeometry = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE)
  // 黑色主体共享材质，粗糙度与金属度决定受光效果。
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x17191e,
    roughness: 0.62,
    metalness: 0.08,
  })
  // 按颜色缓存的六种贴纸材质。
  private readonly stickerMaterials = new Map<CubeColor, THREE.MeshBasicMaterial>()
  // 离散坐标到小方块节点的映射，用于贴纸定位和选择旋转层。
  private readonly cubies = new Map<string, THREE.Group>()
  // 监听容器大小变化，联动相机宽高比和渲染分辨率。
  private readonly resizeObserver: ResizeObserver
  // 最近一次主渲染循环的请求编号，用于卸载时取消。
  private animationFrame = 0
  // 销毁标记，阻止主渲染循环继续安排下一帧。
  private destroyed = false

  /** 创建透明画布、相机、鼠标控制、共享材质，并启动尺寸监听与渲染循环。 */
  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    // 限制像素比最大为 2，兼顾高分屏清晰度与 GPU 开销。
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // 默认从右上前方观察，能同时看到三面。
    this.camera.position.set(6.4, 5.2, 7.2)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = 6.5
    this.controls.maxDistance = 13
    this.controls.target.set(0, 0, 0)

    // 色块直接显示共用的 sRGB 配色，避免灯光把粉色染灰、浅色照白。
    // 黑色主体仍使用受光材质，保留边框的立体层次。
    for (const [color, hex] of Object.entries(COLOR_HEX)) {
      this.stickerMaterials.set(color as CubeColor, new THREE.MeshBasicMaterial({
        color: hex,
        toneMapped: false,
        side: THREE.DoubleSide,
      }))
    }

    this.scene.add(this.cubeRoot)
    this.addLights()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.tick()
  }

  /** 添加环境光、主光与补光，使贴纸和黑色边框具有立体层次。 */
  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xdce9ff, 0x151926, 2.6))

    // 白色主方向光，从右上前方照亮魔方。
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2)
    keyLight.position.set(5, 8, 7)
    keyLight.castShadow = true
    this.scene.add(keyLight)

    // 蓝色补光，从另一侧补充暗部细节。
    const fillLight = new THREE.DirectionalLight(0x7ea7ff, 2.1)
    fillLight.position.set(-6, 2, -4)
    this.scene.add(fillLight)
  }

  /** 根据容器尺寸更新相机投影与画布大小。 */
  private resize(): void {
    // 容器宽度至少为 1，避免零尺寸导致无效宽高比。
    const width = Math.max(this.container.clientWidth, 1)
    // 容器高度至少为 1，防止除以零。
    const height = Math.max(this.container.clientHeight, 1)
    this.camera.aspect = width / height
    // aspect 修改后需重算投影矩阵才能保持模型比例。
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  /** 箭头函数固定 this，逐帧更新控制器阻尼并绘制场景。 */
  private tick = (): void => {
    if (this.destroyed) return
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  /** 根据逻辑快照重建 26 个可见小方块与 54 张贴纸，复用几何体和材质。 */
  render(facelets: Facelets): void {
    // 清除旧节点和坐标索引；共享资源仍保留，最终由 dispose 释放。
    this.cubeRoot.clear()
    this.cubies.clear()

    // 遍历 3×3×3 坐标，跳过不可见的内部核心。
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          if (x === 0 && y === 0 && z === 0) continue

          // 单个小方块组，主体和对应贴纸随它一起转动。
          const cubie = new THREE.Group()
          cubie.position.set(x * CUBIE_SPACING, y * CUBIE_SPACING, z * CUBIE_SPACING)
          // 保存整数逻辑坐标，转层筛选无需依赖浮点位置。
          cubie.userData.coord = { x, y, z }

          // 用共享几何体与黑色材质构造主体。
          const body = new THREE.Mesh(this.cubieGeometry, this.bodyMaterial)
          body.castShadow = true
          body.receiveShadow = true
          cubie.add(body)
          this.cubeRoot.add(cubie)
          this.cubies.set(coordKey(x, y, z), cubie)
        }
      }
    }

    // 用与逻辑转层相同的空间描述放置每一张贴纸。
    for (const slot of FACELET_DESCRIPTORS) {
      // 通过离散位置查找承载该贴纸的小方块。
      const cubie = this.cubies.get(coordKey(slot.position.x, slot.position.y, slot.position.z))
      if (!cubie) continue

      // 根据逻辑色块选择共享的颜色材质。
      const material = this.stickerMaterials.get(facelets[slot.face][slot.index])
      if (!material) continue

      // 当前贴纸的网格节点。
      const sticker = new THREE.Mesh(this.stickerGeometry, material)
      // 面的外法线决定贴纸的局部偏移与朝向。
      const { x, y, z } = slot.normal
      // 主体半边长为 0.48，贴纸放在 0.486 处以避免深度闪烁。
      sticker.position.set(x * 0.486, y * 0.486, z * 0.486)

      // 平面默认朝 +z；绕局部轴旋转使其对准目标面。
      if (x === 1) sticker.rotation.y = Math.PI / 2
      else if (x === -1) sticker.rotation.y = -Math.PI / 2
      else if (y === 1) sticker.rotation.x = -Math.PI / 2
      else if (y === -1) sticker.rotation.x = Math.PI / 2
      else if (z === -1) sticker.rotation.y = Math.PI

      cubie.add(sticker)
    }
  }

  /**
   * 将目标层挂到临时枢轴，播放转动后用精确逻辑快照重建，避免误差累计。
   * @param move 要播放的标准面动作。
   * @param nextFacelets 由逻辑层预计算的转动后状态。
   * @param duration 每次 90° 转动的持续时间，单位为毫秒。
   * @returns 动画播放并重建完成后兑现的 Promise。
   */
  async animateMove(move: MoveToken, nextFacelets: Facelets, duration = 650): Promise<void> {
    // 从动作记号获取选层规则与动画弧度。
    const { definition, angle } = parseMove(move)
    // 位于魔方原点的临时父节点，统一驱动整层旋转。
    const pivot = new THREE.Group()
    this.cubeRoot.add(pivot)

    // 选出旋转轴坐标等于目标外层的九个小方块。
    const layerCubies = [...this.cubies.values()].filter((cubie) => {
      // userData 不提供业务类型，通过断言读取预存的 x/y/z 坐标。
      const coord = cubie.userData.coord as Record<'x' | 'y' | 'z', number>
      return coord[definition.axis] === definition.layer
    })
    // attach 更换父节点时保留世界变换，避免选层瞬间位置跳变。
    for (const cubie of layerCubies) pivot.attach(cubie)

    // 半圈拆成两次 90°，在中间停顿，让用户能辨认并跟随两次转动。
    const turns = move.endsWith('2') ? 2 : 1
    for (let turn = 0; turn < turns; turn += 1) {
      if (turn > 0) await new Promise((resolve) => window.setTimeout(resolve, 220))
      const startedAt = performance.now()
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1)
          // 平滑起步和收尾，避免大部分角度在最初几帧内完成。
          const eased = progress * progress * (3 - 2 * progress)
          pivot.rotation[definition.axis] = (angle / turns) * (turn + eased)

          if (progress < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })
    }

    // 动画结束后以整数逻辑状态重建，清除临时枢轴与浮点旋转。
    this.render(nextFacelets)
  }

  /** 恢复默认相机位置与观察中心，不改变魔方逻辑状态。 */
  resetView(): void {
    this.camera.position.set(6.4, 5.2, 7.2)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  /** 停止渲染、移除监听与画布，并释放共享几何体、材质和渲染器。 */
  dispose(): void {
    this.destroyed = true
    cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.cubieGeometry.dispose()
    this.stickerGeometry.dispose()
    this.bodyMaterial.dispose()
    for (const material of this.stickerMaterials.values()) material.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
