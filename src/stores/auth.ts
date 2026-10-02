import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getProfile, login as loginRequest, type UserProfile } from '@/services/auth'
import { RequestError } from '@/services/request'

const sessionKey = 'cube-assistant.auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const user = ref<UserProfile | null>(null)
  const restoring = ref(false)
  const authenticated = computed(() => Boolean(token.value && user.value))
  const displayName = computed(() => user.value?.nickname?.trim() || user.value?.email.split('@')[0] || '魔方玩家')
  let expiryTimer: number | undefined

  function logout() {
    window.clearTimeout(expiryTimer)
    token.value = ''
    user.value = null
    sessionStorage.removeItem(sessionKey)
  }

  function saveSession(nextToken: string, profile: UserProfile) {
    // JWT 到期后同步更新页头，避免长时间停留时仍显示已登录。
    const payloadPart = nextToken.split('.')[1]
    if (!payloadPart) throw new Error('登录凭证无效，请重新登录')
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))
    const remaining = Number(payload.exp) * 1000 - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) throw new Error('登录已过期，请重新登录')
    window.clearTimeout(expiryTimer)
    sessionStorage.setItem(sessionKey, JSON.stringify({ token: nextToken, user: profile }))
    token.value = nextToken
    user.value = profile
    // 超长有效期分段等待，避免 setTimeout 的 32 位上限。
    const scheduleExpiry = () => {
      const delay = Number(payload.exp) * 1000 - Date.now()
      if (delay <= 0) logout()
      else expiryTimer = window.setTimeout(scheduleExpiry, Math.min(delay, 2147483647))
    }
    scheduleExpiry()
  }

  async function login(email: string, password: string) {
    const result = await loginRequest(email, password)
    if (!result?.token) throw new Error('登录失败，服务未返回登录凭证')
    const profile = await getProfile(result.token)
    if (!profile?.email) throw new Error('无法获取用户信息，请重新登录')
    saveSession(result.token, profile)
  }

  async function restoreSession() {
    const saved = sessionStorage.getItem(sessionKey)
    if (!saved || restoring.value) return
    restoring.value = true
    try {
      const session = JSON.parse(saved)
      if (!session.user?.email) throw new Error('无效的用户信息')
      saveSession(session.token, session.user)
      const currentToken = token.value
      try {
        const profile = await getProfile(currentToken)
        if (token.value !== currentToken) return
        if (!profile?.email) logout()
        else saveSession(currentToken, profile)
      } catch (error) {
        if (token.value === currentToken && error instanceof RequestError && error.status === 401) logout()
      }
    } catch {
      logout()
    } finally {
      restoring.value = false
    }
  }

  return { user, authenticated, displayName, restoring, login, logout, restoreSession }
})
