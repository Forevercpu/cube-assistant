<script setup lang="ts">
import { computed } from 'vue'
import {
  COLOR_HEX,
  COLOR_LABEL,
  FACE_LABEL,
} from '@/cube/facelets'
import type { CubeColor, Face, Facelets } from '@/types/cube'

const props = defineProps<{
  facelets: Facelets
  selectedColor: CubeColor
  counts: Record<CubeColor, number>
  solving: boolean
  solveError: string
}>()

const emit = defineEmits<{
  'update:selectedColor': [color: CubeColor]
  sticker: [face: Face, index: number, color: CubeColor]
  solve: []
  reset: []
}>()

const colors = Object.keys(COLOR_HEX) as CubeColor[]
const allColorsComplete = computed(() => Object.values(props.counts).every((count) => count === 9))

const editorFaces: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']
</script>

<template>
  <section class="panel editor-panel">
    <div class="panel-heading editor-heading">
      <div>
        <p class="eyebrow">实体魔方录入</p>
        <h2>设置六个面的颜色</h2>
      </div>
      <button type="button" class="text-button" @click="emit('reset')">清空重录</button>
    </div>

    <div class="orientation-callout">
      <span class="callout-icon">◎</span>
      <p><strong>保持方向不变</strong>：白色中心朝上，绿色中心朝前，再按展开图录入。</p>
    </div>

    <div class="palette" aria-label="颜色选择">
      <button
        v-for="color in colors"
        :key="color"
        type="button"
        class="palette-color"
        :class="{ active: selectedColor === color }"
        :title="COLOR_LABEL[color]"
        @click="emit('update:selectedColor', color)"
      >
        <span :style="{ backgroundColor: `#${COLOR_HEX[color].toString(16).padStart(6, '0')}` }" />
        {{ COLOR_LABEL[color].replace('色', '') }}
        <small :class="{ complete: counts[color] === 9, over: counts[color] > 9 }">{{ counts[color] }}/9</small>
      </button>
    </div>

    <div class="cube-net">
      <div
        v-for="face in editorFaces"
        :key="face"
        class="face-editor"
        :class="`face-${face.toLowerCase()}`"
      >
        <div class="face-title">
          <span>{{ face }}</span>
          {{ FACE_LABEL[face] }}
        </div>
        <div class="face-grid">
          <button
            v-for="(color, index) in facelets[face]"
            :key="index"
            type="button"
            class="sticker-button"
            :class="{ center: index === 4 }"
            :disabled="index === 4"
            :title="index === 4 ? `${FACE_LABEL[face]}中心块固定` : `设置为${COLOR_LABEL[selectedColor]}`"
            :style="{ backgroundColor: `#${COLOR_HEX[color].toString(16).padStart(6, '0')}` }"
            @click="emit('sticker', face, index, selectedColor)"
          >
            <span v-if="index === 4">{{ face }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="solveError" class="error-message">{{ solveError }}</div>

    <button
      type="button"
      class="primary-button solve-button"
      :disabled="solving || !allColorsComplete"
      @click="emit('solve')"
    >
      <span v-if="solving" class="spinner" />
      {{ solving ? '正在计算复原路线…' : '检查并生成复原步骤' }}
    </button>
    <p v-if="!allColorsComplete" class="input-hint">颜色数量全部达到 9/9 后即可求解</p>
  </section>
</template>
