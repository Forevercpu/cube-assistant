<script setup lang="ts">
// 自由练习操作面板，提供六面转动、撤销、打乱和重置事件。
import type { MoveToken } from '@/types/cube'

/** 父组件控制动画期间的按钮禁用状态及是否存在可撤销历史。 */
defineProps<{
  // 正在转层时禁止发起新动作。
  disabled: boolean
  // 历史非空时才允许撤销。
  canUndo: boolean
}>()

/** 按钮只发出操作意图，实际状态更新与动画由父组件执行。 */
const emit = defineEmits<{
  // 转动事件携带一个合法的标准动作记号。
  move: [move: MoveToken]
  // 请求撤销最近一步。
  undo: []
  // 请求生成随机打乱状态。
  scramble: []
  // 请求恢复复原状态。
  reset: []
}>()

// 每项包含中文面名称和该面的顺/逆时针动作；数组驱动按钮渲染。
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

    <!-- 六组面转动按钮，统一通过 move 事件把动作交给父组件。 -->
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

    <!-- 练习辅助操作；撤销还需要满足历史非空条件。 -->
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

<style scoped lang="scss">
@use '../styles/shared';

@include shared.eyebrow;
@include shared.panel;
@include shared.buttons;

.keyboard-tip {
  color: #687386;
  font-size: 12px;
}

/* 六个面控制组，每组两列分别表示顺时针与逆时针。 */
.move-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 0 22px 20px;
}

.move-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;

  > span {
    grid-column: 1 / -1;
    margin-bottom: 1px;
    color: #657084;
    font-size: 12px;
    text-align: center;
  }

  button {
    height: 44px;
    border: 1px solid #2a3342;
    border-radius: 8px;
    color: #d8e0ed;
    background: #1b2230;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: rgba(120, 228, 187, 0.45);
      color: var(--primary);
      background: rgba(120, 228, 187, 0.08);
      transform: translateY(-1px);
    }
  }
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid var(--line);

  .text-button {
    margin-left: auto;
  }
}

@media (max-width: 1200px) {
  .move-grid {
    gap: 5px;
  }
}
</style>
