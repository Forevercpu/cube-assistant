<script setup lang="ts">
// 实体魔方颜色录入面板，负责调色板、六面展开图和求解入口。
import { computed } from 'vue'
import {
  COLOR_HEX,
  COLOR_LABEL,
  FACE_LABEL,
} from '@/cube/facelets'
import type { CubeColor, Face, Facelets } from '@/types/cube'

/** 父组件提供录入状态；该面板通过事件请求修改，不直接改写 props。 */
const props = defineProps<{
  // 六面各九格的颜色快照。
  facelets: Facelets
  // 点击色块时要填入的画笔颜色。
  selectedColor: CubeColor
  // 六种颜色各自的当前数量。
  counts: Record<CubeColor, number>
  // 后台求解中，控制按钮禁用与等待提示。
  solving: boolean
  solveStatus: string
  // 求解或合法性检查失败的提示文本。
  solveError: string
}>()

/** 命名元组声明事件参数，便于 TS 检查父子组件的调用约定。 */
const emit = defineEmits<{
  // 选择画笔颜色，遵循 Vue 的 update:属性 事件约定。
  'update:selectedColor': [color: CubeColor]
  // 请求修改指定面的格子，index 为 0～8。
  sticker: [face: Face, index: number, color: CubeColor]
  // 请求检查并求解，无附带参数。
  solve: []
  // 请求恢复初始颜色，无附带参数。
  reset: []
}>()

// 从共用色值表提取调色板；断言将 Object.keys 的 string[] 收窄为颜色类型。
const colors = Object.keys(COLOR_HEX) as CubeColor[]
// 每色九格时允许求解，进一步的块合法性检查交给 Worker。
const allColorsComplete = computed(() => Object.values(props.counts).every((count) => count === 9))

// 展开图遍历顺序，具体位置由 CSS 的网格区域控制。
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

    <!-- 固定白色朝上、绿色朝前的录入约定，保证各面方向一致。 -->
    <div class="orientation-callout">
      <span class="callout-icon">◎</span>
      <p><strong>保持方向不变</strong>：白色中心朝上，绿色中心朝前，再按展开图录入。</p>
    </div>

    <!-- 画笔颜色选择与数量反馈；数值色码转为六位 CSS 十六进制字符串。 -->
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

    <!-- 六面展开图；中心格 index=4 固定，只允许编辑其余色块。 -->
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

    <!-- 展示仓库传回的校验或求解错误。 -->
    <div v-if="solveError" class="error-message">{{ solveError }}</div>

    <button
      type="button"
      class="primary-button solve-button"
      :disabled="solving || !allColorsComplete"
      @click="emit('solve')"
    >
      <span v-if="solving" class="spinner" />
      {{ solving ? solveStatus : '检查并生成复原步骤' }}
    </button>
    <!-- 数量未齐时说明求解按钮为何不可用。 -->
    <p v-if="!allColorsComplete" class="input-hint">颜色数量全部达到 9/9 后即可求解</p>
  </section>
</template>
