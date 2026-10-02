<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import MoveControls from '@/components/MoveControls.vue'
import { useCubeStore } from '@/stores/cube'
import type { MoveToken } from '@/types/cube'
const props = defineProps<{
  active: boolean
  disabled: boolean
  performMove: (move: MoveToken, record?: boolean) => Promise<void>
}>()
const store = useCubeStore()
const { history } = storeToRefs(store)
async function undo(): Promise<void> {
  if (props.disabled) return
  // 最近一步的逆操作，没有历史时为 null。
  const move = store.takeUndoMove()
  if (move) await props.performMove(move, false)
}
function handleKeydown(event: KeyboardEvent): void {
  if (!props.active || props.disabled) return
  // 避免拦截浏览器组合快捷键和输入框内的正常输入。
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  )
    return

  // 统一大小写后识别六个面字母。
  const face = event.key.toUpperCase()
  if (!["U", "R", "F", "D", "L", "B"].includes(face)) return
  // 已识别的动作键由应用处理，阻止浏览器默认行为。
  event.preventDefault()
  void props.performMove(`${face}${event.shiftKey ? "'" : ""}` as MoveToken)
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <MoveControls
    :disabled="disabled"
    :can-undo="history.length > 0"
    @move="props.performMove"
    @undo="undo"
    @scramble="store.scramble"
    @reset="store.resetSolved"
  />
</template>
