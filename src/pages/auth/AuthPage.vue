<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Hide, View } from '@element-plus/icons-vue'
import { register, sendVerificationCode } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{ mode?: 'login' | 'register' }>(), {
  mode: 'login',
})
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const isRegister = computed(() => props.mode === 'register')
const form = reactive({ email: '', password: '', confirmPassword: '', code: '' })
const submitting = ref(false)
const sending = ref(false)
const countdown = ref(0)
const error = ref('')
const notice = ref('')
const showPassword = ref(false)
let timer: number | undefined
let active = true

watch(() => props.mode, () => {
  error.value = ''
  notice.value = props.mode === 'login' && route.query.registered === '1'
    ? '注册成功，请使用邮箱和密码登录。'
    : ''
  form.password = ''
  form.confirmPassword = ''
  form.code = ''
  showPassword.value = false
}, { immediate: true })

function validEmail() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    error.value = '请输入有效的邮箱地址'
    return false
  }
  return true
}

async function sendCode() {
  if (sending.value || countdown.value || submitting.value) return
  error.value = ''
  notice.value = ''
  if (!validEmail()) return
  sending.value = true
  try {
    await sendVerificationCode(form.email.trim())
    if (!active) return
    notice.value = '验证码已发送至您的邮箱，5 分钟内有效，请留意垃圾邮件。'
    countdown.value = 60
    window.clearInterval(timer)
    const deadline = Date.now() + 60000
    timer = window.setInterval(() => {
      countdown.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (!countdown.value) window.clearInterval(timer)
    }, 1000)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '验证码发送失败'
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (submitting.value || sending.value) return
  error.value = ''
  notice.value = ''
  if (!validEmail()) return
  if (!form.password) {
    error.value = '请输入密码'
    return
  }
  if (isRegister.value) {
    if (form.password.length < 6 || form.password.length > 50) {
      error.value = '密码长度应为 6 至 50 位'
      return
    }
    if (form.password !== form.confirmPassword) {
      error.value = '两次输入的密码不一致'
      return
    }
    if (!/^\d{6}$/.test(form.code.trim())) {
      error.value = '请输入 6 位邮箱验证码'
      return
    }
  }
  submitting.value = true
  try {
    if (isRegister.value) {
      await register(form.email.trim(), form.password, form.code.trim())
      if (!active) return
      await router.replace({ name: 'login', query: { registered: '1' } })
    } else {
      await auth.login(form.email.trim(), form.password)
      if (active) await router.replace({ name: 'home' })
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '操作失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  active = false
  window.clearInterval(timer)
})
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="auth-title">
      <div class="auth-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      </div>
      <p class="eyebrow">CUBE ASSISTANT</p>
      <h1 id="auth-title">{{ isRegister ? '创建账户' : '欢迎回来' }}</h1>
      <p class="auth-description">{{ isRegister ? '注册账户，开始你的魔方之旅' : '使用个人网站账户登录魔方助手' }}</p>

      <form @submit.prevent="submit">
        <fieldset :disabled="submitting || sending">
          <label for="auth-email">邮箱地址</label>
          <input id="auth-email" v-model="form.email" type="email" autocomplete="email" placeholder="请输入邮箱地址" required maxlength="254" />

          <template v-if="isRegister">
            <label for="auth-code">邮箱验证码</label>
            <div class="code-field">
              <input id="auth-code" v-model="form.code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" pattern="[0-9]{6}" maxlength="6" required />
              <button type="button" class="send-code" :disabled="countdown > 0" @click="sendCode">
                {{ sending ? '发送中…' : countdown ? `${countdown}s 后重发` : '发送验证码' }}
              </button>
            </div>
          </template>

          <label for="auth-password">{{ isRegister ? '设置密码' : '密码' }}</label>
          <div class="password-field">
            <input id="auth-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" :placeholder="isRegister ? '6 至 50 位密码' : '请输入密码'" :minlength="isRegister ? 6 : undefined" :maxlength="isRegister ? 50 : undefined" required />
            <button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              <el-icon :size="20" aria-hidden="true">
                <Hide v-if="showPassword" />
                <View v-else />
              </el-icon>
            </button>
          </div>

          <template v-if="isRegister">
            <label for="auth-confirm">确认密码</label>
            <input id="auth-confirm" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="请再次输入密码" minlength="6" maxlength="50" required />
          </template>
        </fieldset>

        <p v-if="error" class="form-message error" role="alert">{{ error }}</p>
        <p v-if="notice" class="form-message success" role="status">{{ notice }}</p>
        <button class="submit-button" type="submit" :disabled="submitting || sending">
          {{ submitting ? (isRegister ? '注册中…' : '登录中…') : (isRegister ? '注册' : '登录') }}
        </button>
      </form>

      <p class="switch-auth">
        {{ isRegister ? '已有账户？' : '还没有账户？' }}
        <button type="button" :disabled="submitting || sending" @click="router.push({ name: isRegister ? 'login' : 'register' })">{{ isRegister ? '立即登录' : '立即注册' }}</button>
      </p>
      <button type="button" class="back-home" @click="router.push({ name: 'home' })">← 暂不登录，先逛逛</button>
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-page {
  display: grid;
  place-items: center;
  min-height: calc(100vh - 170px);
  padding: 48px 24px;
  background: radial-gradient(ellipse at center, rgba(120, 228, 187, 0.06), transparent 65%);
}
.auth-card {
  width: min(100%, 460px);
  padding: 36px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
  h1 { margin: 8px 0; text-align: center; font-size: 30px; }
  button { cursor: pointer; }
  button:disabled { cursor: not-allowed; }
}
.auth-icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin: 0 auto 18px;
  border: 1px solid rgba(120, 228, 187, 0.25);
  border-radius: 18px;
  background: rgba(120, 228, 187, 0.1);
  color: var(--primary);
  svg { width: 30px; height: 30px; }
}
.eyebrow { margin: 0; color: var(--primary); text-align: center; font-size: 11px; letter-spacing: 0.2em; }
.auth-description { margin: 0 0 28px; color: var(--muted); text-align: center; font-size: 14px; }
fieldset {
  display: grid;
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  label { margin-top: 8px; color: #c6d0de; font-size: 14px; }
}
input {
  width: 100%;
  min-width: 0;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0d121a;
  color: #eef2f8;
  font: inherit;
  font-size: 14px;
  &::placeholder { color: #657186; }
  &:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
  &:disabled { opacity: 0.6; }
}
.code-field { display: flex; gap: 10px; }
.send-code { flex-shrink: 0; padding: 0 12px; border: 1px solid rgba(120, 228, 187, 0.25); border-radius: 10px; background: rgba(120, 228, 187, 0.08); color: var(--primary); font-size: 13px; }
.password-field {
  position: relative;
  input { padding-right: 50px; }
  button {
    position: absolute;
    top: 3px;
    right: 4px;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    &:hover:not(:disabled) { color: var(--primary); }
    &:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
  }
}
.form-message { margin: 16px 0 0; padding: 10px 12px; border-radius: 8px; font-size: 13px; overflow-wrap: anywhere; }
.error { color: #ffa7a7; background: rgba(255, 100, 100, 0.08); }
.success { color: var(--primary); background: rgba(120, 228, 187, 0.08); }
.submit-button { width: 100%; height: 48px; margin-top: 24px; border: 0; border-radius: 10px; background: var(--primary); color: #08271e; font-weight: 700; &:hover:not(:disabled) { background: var(--primary-strong); } }
.switch-auth { margin: 22px 0; color: var(--muted); text-align: center; font-size: 14px; button { padding: 0; border: 0; background: transparent; color: var(--primary); font-size: inherit; } }
.back-home { width: 100%; padding: 14px 0 0; border: 0; border-top: 1px solid var(--line); background: transparent; color: var(--muted); font-size: 14px; }
@media (max-width: 480px) { .auth-card { padding: 26px 20px; } }
</style>
