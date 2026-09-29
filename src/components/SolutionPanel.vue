<script setup lang="ts">
import { computed } from 'vue'
import { moveDescription } from '@/cube/facelets'
import type { MoveToken } from '@/types/cube'

const props = defineProps<{
  steps: MoveToken[]
  index: number
  playing: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
  togglePlay: []
}>()

const currentMove = computed(() => props.steps[props.index] ?? null)
const finished = computed(() => props.steps.length > 0 && props.index >= props.steps.length)
</script>

<template>
  <section class="panel solution-panel">
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

