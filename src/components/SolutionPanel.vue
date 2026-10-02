<script setup lang="ts">
// 复原路线展示面板，显示当前动作、已执行进度与播放控制。
import { computed } from 'vue'
import { moveDescription } from '@/cube/facelets'
import type { MoveToken } from '@/types/cube'

/** 父组件提供路线和播放状态，面板只负责显示与发出控制事件。 */
const props = defineProps<{
  // 按执行顺序排列的完整复原动作。
  steps: MoveToken[]
  // 已执行步数，也是当前待执行动作的零基索引。
  index: number
  // 是否开启自动播放，用于切换按钮文案。
  playing: boolean
  // 单步动画期间禁止新的进度操作。
  disabled: boolean
}>()

/** 无参数播放控制事件，进度实际由父组件更新。 */
const emit = defineEmits<{
  // 请求撤销上一个复原动作。
  previous: []
  // 请求执行当前复原动作。
  next: []
  // 请求切换自动播放状态。
  togglePlay: []
}>()

// 当前待执行动作；路线为空或执行完毕时返回 null。
const currentMove = computed(() => props.steps[props.index] ?? null)
// 非空路线的已执行步数达到总长度时显示复原完成。
const finished = computed(() => props.steps.length > 0 && props.index >= props.steps.length)
</script>

<template>
  <section class="panel solution-panel">
    <!-- 显示待执行动作的中文解释和进度；完成时计数不超过总步数。 -->
    <div class="solution-summary">
      <div>
        <p class="eyebrow">复原路线</p>
        <h2 v-if="finished">魔方已经复原</h2>
        <h2 v-else-if="currentMove">{{ moveDescription(currentMove) }}</h2>
        <h2 v-else>状态本身已经完成</h2>
      </div>
      <div class="step-counter">
        <strong>{{ Math.min(index + 1, steps.length) }}</strong>
        <span>/ {{ steps.length }} 步</span>
      </div>
    </div>

    <!-- 路线只作展示：active 为待执行，done 为已完成，不允许跳步点击。 -->
    <div class="step-list">
      <button
        v-for="(step, stepIndex) in steps"
        :key="`${step}-${stepIndex}`"
        type="button"
        class="step-chip"
        :class="{ active: stepIndex === index, done: stepIndex < index }"
        disabled
      >
        <small>{{ stepIndex + 1 }}</small>
        {{ step }}
      </button>
    </div>

    <!-- 回退、播放和前进按钮根据边界及动画状态禁用。 -->
    <div class="solution-actions">
      <button type="button" class="secondary-button" :disabled="disabled || index === 0" @click="emit('previous')">
        上一步
      </button>
      <button
        type="button"
        class="play-button"
        :disabled="disabled || finished || steps.length === 0"
        @click="emit('togglePlay')"
      >
        {{ playing ? '暂停' : '自动播放' }}
      </button>
      <button
        type="button"
        class="primary-button next-button"
        :disabled="disabled || finished || steps.length === 0"
        @click="emit('next')"
      >
        下一步
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '../styles/shared';

@include shared.eyebrow;
@include shared.panel;
@include shared.buttons;

/* 复原路线摘要、横向可滚动步骤列表和播放操作区。 */
.solution-panel {
  overflow: hidden;
}

.solution-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border-bottom: 1px solid var(--line);
}

.step-counter {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #657084;

  strong {
    color: var(--primary);
    font-size: 26px;
  }

  span {
    font-size: 13px;
  }
}

.step-list {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 16px 22px;
  scrollbar-width: thin;
}

.step-chip {
  display: grid;
  place-items: center;
  flex: 0 0 56px;
  height: 56px;
  border: 1px solid #2a3342;
  border-radius: 8px;
  color: #b6c0ce;
  background: #171e29;

  small {
    color: #586376;
    font-size: 12px;
  }

  /* 已执行步骤弱化显示，待执行步骤高亮显示。 */
  &.done {
    color: #658777;
    border-color: rgba(120, 228, 187, 0.12);
    background: rgba(120, 228, 187, 0.04);
  }

  &.active {
    color: #071f18;
    border-color: var(--primary);
    background: var(--primary);
    box-shadow: 0 6px 20px rgba(64, 202, 150, 0.15);

    small {
      color: rgba(7, 31, 24, 0.55);
    }
  }
}

/* 三列播放控制，中间按钮略宽。 */
.solution-actions {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid var(--line);
}

.play-button {
  min-height: 44px;
  border: 1px solid rgba(110, 160, 255, 0.3);
  color: #aac5ff;
  background: rgba(110, 160, 255, 0.08);
}

.next-button {
  width: 100%;
}
</style>
