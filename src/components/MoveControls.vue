<script setup lang="ts">
import type { MoveToken } from '@/types/cube'

defineProps<{
  disabled: boolean
  canUndo: boolean
}>()

const emit = defineEmits<{
  move: [move: MoveToken]
  undo: []
  scramble: []
  reset: []
}>()

const moveGroups: { face: string; moves: MoveToken[] }[] = [
  { face: '上', moves: ['U', "U'"] },
  { face: '下', moves: ['D', "D'"] },
  { face: '左', moves: ['L', "L'"] },
  { face: '右', moves: ['R', "R'"] },
  { face: '前', moves: ['F', "F'"] },
  { face: '后', moves: ['B', "B'"] },
]
</script>

<template>
  <section class="panel move-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">转动控制</p>
        <h2>练习你的手法</h2>
      </div>
      <span class="keyboard-tip">键盘 U R F D L B</span>
    </div>

    <div class="move-grid">
      <div v-for="group in moveGroups" :key="group.face" class="move-group">
        <span>{{ group.face }}</span>
        <button
          v-for="move in group.moves"
          :key="move"
          type="button"
          :disabled="disabled"
          @click="emit('move', move)"
        >
          {{ move }}
        </button>
      </div>
    </div>

    <div class="control-actions">
      <button type="button" class="secondary-button" :disabled="disabled || !canUndo" @click="emit('undo')">
        撤销一步
      </button>
      <button type="button" class="secondary-button" :disabled="disabled" @click="emit('scramble')">
        随机打乱
      </button>
      <button type="button" class="text-button" :disabled="disabled" @click="emit('reset')">
        恢复完成状态
      </button>
    </div>
  </section>
</template>

