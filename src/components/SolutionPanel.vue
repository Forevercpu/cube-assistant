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

