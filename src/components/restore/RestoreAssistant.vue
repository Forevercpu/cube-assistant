<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SolutionPanel from '@/components/SolutionPanel.vue'
import { invertMove } from '@/cube/facelets'
import { useRestoreCubeStore } from '@/stores/cube'
import type { MoveToken } from '@/types/cube'
const props = defineProps<{
  active: boolean
  disabled: boolean
  performMove: (move: MoveToken, record?: boolean) => Promise<void>
}>()
const { solution, solutionIndex, solved, solveError } = storeToRefs(useRestoreCubeStore())
const playing = ref(false)
function stop() { playing.value = false }
watch(() => props.active, stop)
onBeforeUnmount(stop)
defineExpose({ stop })
async function nextSolutionStep(): Promise<void> {
  const steps = solution.value
  const index = solutionIndex.value
  // 当前待执行动作，越过路线末尾时为 undefined。
  const move = solution.value[solutionIndex.value]
  if (!move || props.disabled) return
  await props.performMove(move, false)
  if (solution.value === steps && solutionIndex.value === index) {
    solutionIndex.value += 1
  }
}
async function previousSolutionStep(): Promise<void> {
  if (solutionIndex.value === 0 || props.disabled) return
  const steps = solution.value
  const index = solutionIndex.value
  playing.value = false
  // 最近完成的复原动作；不是当前待执行动作。
  const move = solution.value[solutionIndex.value - 1]
  if (!move) return
  await props.performMove(invertMove(move), false)
  if (solution.value === steps && solutionIndex.value === index) {
    solutionIndex.value -= 1
  }
}
async function toggleAutoPlay(): Promise<void> {
  playing.value = !playing.value
  while (playing.value && solutionIndex.value < solution.value.length) {
    await nextSolutionStep()
    // 步间停顿，给用户留出观察结果和跟随实体魔方的时间。
    await new Promise((resolve) => window.setTimeout(resolve, 400))
  }
  playing.value = false
}
</script>

<template>
  <div v-if="solution.length > 0 || (solved && !solveError)" class="restore-assistant">
    <SolutionPanel
      v-if="solution.length > 0"
      :steps="solution"
      :index="solutionIndex"
      :playing="playing"
      :disabled="disabled"
      @previous="previousSolutionStep"
      @next="nextSolutionStep"
      @toggle-play="toggleAutoPlay"
    />

    <section
      v-if="
        solution.length === 0 &&
        solved &&
        !solveError
      "
      class="panel solved-note"
    >
      <span>✓</span>
      <div>
        <strong>当前魔方已经完成</strong>
        <p>修改任意非中心色块后，可以重新检查并生成路线。</p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/shared";
@include shared.panel;
.restore-assistant { display: grid; gap: 18px; }
.solved-note {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;

  > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    color: #08271e;
    background: var(--primary);
    font-weight: 900;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 14px;
  }
}
</style>
