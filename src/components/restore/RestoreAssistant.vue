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
  performMove: (move: MoveToken, record?: boolean, duration?: number, reverseHalfTurn?: boolean) => Promise<void>
}>()
const store = useRestoreCubeStore()
const { solution, solutionIndex, solved, solveError } = storeToRefs(store)
const playing = ref(false)
const playbackRate = ref(1)
let playbackSession = 0
function stop() {
  playing.value = false
  playbackSession += 1
}
watch(() => props.active, stop)
onBeforeUnmount(stop)
defineExpose({ stop })
async function nextSolutionStep(duration?: number): Promise<void> {
  const steps = solution.value
  const index = solutionIndex.value
  // 当前待执行动作，越过路线末尾时为 undefined。
  const move = solution.value[solutionIndex.value]
  if (!move || props.disabled) return
  await props.performMove(move, false, duration)
  if (solution.value === steps && solutionIndex.value === index) {
    solutionIndex.value += 1
  }
}
async function previousSolutionStep(): Promise<void> {
  if (solutionIndex.value === 0 || props.disabled) return
  const steps = solution.value
  const index = solutionIndex.value
  stop()
  // 最近完成的复原动作；不是当前待执行动作。
  const move = solution.value[solutionIndex.value - 1]
  if (!move) return
  // 半圈的逻辑逆操作仍是自身，但后退动画需要沿原动作的反方向播放。
  await props.performMove(invertMove(move), false, undefined, move.endsWith('2'))
  if (solution.value === steps && solutionIndex.value === index) {
    solutionIndex.value -= 1
  }
}
async function toggleAutoPlay(): Promise<void> {
  if (playing.value) {
    stop()
    return
  }
  if (props.disabled || !props.active) return
  playing.value = true
  const session = ++playbackSession
  while (playing.value && session === playbackSession && solutionIndex.value < solution.value.length) {
    // 每步开始时读取倍速，播放中修改会从下一步生效。
    const rate = playbackRate.value
    await nextSolutionStep(650 / rate)
    if (!playing.value || session !== playbackSession) break
    // 步间停顿，给用户留出观察结果和跟随实体魔方的时间。
    await new Promise((resolve) => window.setTimeout(resolve, 400 / rate))
  }
  if (session === playbackSession) stop()
}
function selectSolutionStep(index: number): void {
  if (props.disabled || !props.active) return
  stop()
  store.seekSolutionStep(index)
}
</script>

<template>
  <div v-if="solution.length > 0 || (solved && !solveError)" class="restore-assistant">
    <SolutionPanel
      v-if="solution.length > 0"
      :steps="solution"
      :index="solutionIndex"
      :playing="playing"
      :playback-rate="playbackRate"
      :disabled="disabled"
      @previous="previousSolutionStep"
      @next="nextSolutionStep"
      @toggle-play="toggleAutoPlay"
      @select-step="selectSolutionStep"
      @update-playback-rate="playbackRate = $event"
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
