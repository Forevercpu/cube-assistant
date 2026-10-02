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

<style scoped lang="scss">
@use '../styles/shared';

@include shared.eyebrow;
@include shared.panel;
@include shared.buttons;

/* 实体魔方录入面板及方向提示。 */
.editor-panel {
  overflow: hidden;
}

.editor-heading {
  border-bottom: 1px solid var(--line);
}

.orientation-callout {
  display: flex;
  gap: 10px;
  margin: 16px 18px 14px;
  padding: 11px 12px;
  border: 1px solid rgba(110, 160, 255, 0.17);
  border-radius: 9px;
  background: rgba(80, 125, 210, 0.08);

  p {
    margin: 0;
    color: #9ba7b8;
    font-size: 13px;
    line-height: 1.55;
  }

  strong {
    color: #d9e3f3;
  }
}

.callout-icon {
  color: var(--blue);
}

/* 六列调色板，反馈选中画笔、颜色齐全或数量超出。 */
.palette {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  padding: 0 18px 16px;
}

.palette-color {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-width: 0;
  padding: 7px 2px 5px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #8c97a8;
  background: #0d121a;
  font-size: 12px;
  cursor: pointer;

  > span {
    width: 26px;
    height: 26px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  }

  small {
    color: #5f6a7a;
    font-size: 12px;

    &.complete {
      color: var(--primary);
    }

    &.over {
      color: #ff716a;
    }
  }

  &.active {
    border-color: rgba(120, 228, 187, 0.55);
    color: #fff;
    background: rgba(120, 228, 187, 0.08);

    > span {
      box-shadow: 0 0 0 3px rgba(120, 228, 187, 0.18), inset 0 0 0 1px rgba(0, 0, 0, 0.18);
    }
  }
}

/* 展开图区域：U 在 F 上方、D 在 F 下方，中间排列 L/F/R/B。 */
.cube-net {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-areas: ". u . ." "l f r b" ". d . .";
  gap: 8px;
  padding: 2px 18px 20px;
}

.face-u {
  grid-area: u;
}

.face-l {
  grid-area: l;
}

.face-f {
  grid-area: f;
}

.face-r {
  grid-area: r;
}

.face-b {
  grid-area: b;
}

.face-d {
  grid-area: d;
}

.face-title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  color: #677387;
  font-size: 12px;

  span {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: #dce4ef;
    background: #242c3a;
    font-size: 12px;
  }
}

/* 每面用 3×3 网格显示色块，aspect-ratio 保证贴纸为正方形。 */
.face-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 5px;
  border-radius: 6px;
  background: #080b10;
}

.sticker-button {
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.1s ease;

  &:hover:not(:disabled) {
    z-index: 1;
    filter: brightness(1.12);
    transform: scale(1.08);
  }

  /* 中心格展示该面的目标颜色，禁用编辑时仍保留完整亮度。 */
  &.center {
    cursor: default;
    opacity: 1;
  }

  span {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    margin: auto;
    border-radius: 50%;
    color: #19212b;
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-weight: 900;
  }
}

/* 求解入口、数量提示和错误提示。 */
.solve-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 36px);
  height: 50px;
  margin: 0 18px 8px;
}

.input-hint {
  margin: 0 18px 16px;
  color: #626d80;
  font-size: 12px;
  text-align: center;
}

.error-message {
  margin: 0 18px 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 103, 97, 0.25);
  border-radius: 8px;
  color: #ffaaa6;
  background: rgba(201, 55, 50, 0.09);
  font-size: 13px;
  line-height: 1.5;
}

/* 通过旋转带有异色顶部边框的圆环表示后台计算中。 */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(6, 39, 29, 0.25);
  border-top-color: #06271d;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
