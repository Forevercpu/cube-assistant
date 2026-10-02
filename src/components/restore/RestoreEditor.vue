<script setup lang="ts">
import { storeToRefs } from 'pinia'
import FaceEditor from '@/components/FaceEditor.vue'
import { useRestoreCubeStore } from '@/stores/cube'
import type { Face } from '@/types/cube'
const emit = defineEmits<{ solve: [] }>()
const store = useRestoreCubeStore()
const { facelets, selectedColor, counts, solving, solveStatus, solveError } = storeToRefs(store)
async function solveCube(): Promise<void> {
  emit('solve')
  try {
    await store.solve()
  } catch {
    // 具体错误由求解器返回并显示在录入面板中。
  }
}
</script>

<template>
  <FaceEditor
    :facelets="facelets"
    :selected-color="selectedColor"
    :counts="counts"
    :solving="solving"
    :solve-status="solveStatus"
    :solve-error="solveError"
    @update:selected-color="selectedColor = $event"
    @sticker="
      (face: Face, index: number, color) =>
        store.setSticker(face, index, color)
    "
    @solve="solveCube"
    @reset="store.resetSolved"
  />
</template>
