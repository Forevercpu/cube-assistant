<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const avatarFailed = ref(false)
const avatarUrl = computed(() => {
  const avatar = auth.user?.avatar?.trim()
  if (!avatar) return ''

  if (/^(https?:)?\/\//i.test(avatar)) return avatar

  const prefix = window._global_config?.IP_PREFIX?.replace(/\/+$/, '') || ''
  return `${prefix}/${avatar.replace(/^\/+/, '')}`
})
watch(avatarUrl, () => { avatarFailed.value = false })
</script>

<template>
  <div class="user-area">
    <span v-if="auth.restoring" class="session-loading" role="status">正在恢复登录…</span>
    <template v-else-if="auth.authenticated">
      <span class="user-avatar">
        <img
          v-if="avatarUrl && !avatarFailed"
          :src="avatarUrl"
          :alt="`${auth.displayName}的头像`"
          referrerpolicy="no-referrer"
          @error="avatarFailed = true"
        />
        <span v-else aria-hidden="true">{{ auth.displayName.slice(0, 1).toUpperCase() }}</span>
      </span>
      <span class="user-name" :title="auth.displayName">{{ auth.displayName }}</span>
      <button type="button" class="logout-button" @click="auth.logout">退出</button>
    </template>
    <RouterLink v-else :to="{ name: 'login' }" class="login-link">登录</RouterLink>
  </div>
</template>

<style scoped lang="scss">
.user-area {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  font-size: 14px;
}

.session-loading {
  color: var(--muted);
  font-size: 13px;
}

.login-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(120, 228, 187, 0.25);
  border-radius: 8px;
  background: rgba(120, 228, 187, 0.08);
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  &:hover { background: rgba(120, 228, 187, 0.16); }
  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }
}

.user-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border: 1px solid rgba(120, 228, 187, 0.25);
  border-radius: 50%;
  background: rgba(120, 228, 187, 0.1);
  color: var(--primary);
  font-weight: 700;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.user-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button {
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  &:hover { color: #fff; }
}
</style>
