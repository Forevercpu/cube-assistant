import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  COLOR_HEX,
  FACELET_DESCRIPTORS,
  parseMove,
} from '@/cube/facelets'
import type { CubeColor, Facelets, MoveToken } from '@/types/cube'

const CUBIE_SPACING = 1.04
const CUBIE_SIZE = 0.96
const STICKER_SIZE = 0.76

function coordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

export class CubeScene {
  private readonly container: HTMLElement
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  private readonly renderer: THREE.WebGLRenderer
  private readonly controls: OrbitControls
  private readonly cubeRoot = new THREE.Group()
  private readonly cubieGeometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
  private readonly stickerGeometry = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE)
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x17191e,
    roughness: 0.62,
    metalness: 0.08,
  })
  private readonly stickerMaterials = new Map<CubeColor, THREE.MeshStandardMaterial>()
  private readonly cubies = new Map<string, THREE.Group>()
  private readonly resizeObserver: ResizeObserver
  private animationFrame = 0
  private destroyed = false

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.camera.position.set(6.4, 5.2, 7.2)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = 6.5
    this.controls.maxDistance = 13
    this.controls.target.set(0, 0, 0)

    for (const [color, hex] of Object.entries(COLOR_HEX)) {
      this.stickerMaterials.set(color as CubeColor, new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.42,
        metalness: 0,
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

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xdce9ff, 0x151926, 2.6))

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2)
    keyLight.position.set(5, 8, 7)
    keyLight.castShadow = true
    this.scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x7ea7ff, 2.1)
    fillLight.position.set(-6, 2, -4)
    this.scene.add(fillLight)
  }

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private tick = (): void => {
    if (this.destroyed) return
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  render(facelets: Facelets): void {
    this.cubeRoot.clear()
    this.cubies.clear()

    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          if (x === 0 && y === 0 && z === 0) continue

          const cubie = new THREE.Group()
          cubie.position.set(x * CUBIE_SPACING, y * CUBIE_SPACING, z * CUBIE_SPACING)
          cubie.userData.coord = { x, y, z }

          const body = new THREE.Mesh(this.cubieGeometry, this.bodyMaterial)
          body.castShadow = true
          body.receiveShadow = true
          cubie.add(body)
          this.cubeRoot.add(cubie)
          this.cubies.set(coordKey(x, y, z), cubie)
        }
      }
    }

    for (const slot of FACELET_DESCRIPTORS) {
      const cubie = this.cubies.get(coordKey(slot.position.x, slot.position.y, slot.position.z))
      if (!cubie) continue

      const material = this.stickerMaterials.get(facelets[slot.face][slot.index])
      if (!material) continue

      const sticker = new THREE.Mesh(this.stickerGeometry, material)
      const { x, y, z } = slot.normal
      sticker.position.set(x * 0.486, y * 0.486, z * 0.486)

      if (x === 1) sticker.rotation.y = Math.PI / 2
      else if (x === -1) sticker.rotation.y = -Math.PI / 2
      else if (y === 1) sticker.rotation.x = -Math.PI / 2
      else if (y === -1) sticker.rotation.x = Math.PI / 2
      else if (z === -1) sticker.rotation.y = Math.PI

      cubie.add(sticker)
    }
  }

  async animateMove(move: MoveToken, nextFacelets: Facelets, duration = 280): Promise<void> {
    const { definition, angle } = parseMove(move)
    const pivot = new THREE.Group()
    this.cubeRoot.add(pivot)

    const layerCubies = [...this.cubies.values()].filter((cubie) => {
      const coord = cubie.userData.coord as Record<'x' | 'y' | 'z', number>
      return coord[definition.axis] === definition.layer
    })
    for (const cubie of layerCubies) pivot.attach(cubie)

    const startedAt = performance.now()
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        pivot.rotation[definition.axis] = angle * eased

        if (progress < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })

    this.render(nextFacelets)
  }

  resetView(): void {
    this.camera.position.set(6.4, 5.2, 7.2)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

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
