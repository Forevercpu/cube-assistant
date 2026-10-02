import { createRouter, createWebHistory } from 'vue-router'
import CubeHome from '@/pages/home/CubeHome.vue'
import AuthPage from '@/pages/auth/AuthPage.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', redirect: { name: 'practice' } },
    { path: '/practice', name: 'practice', component: CubeHome, props: { mode: 'practice' } },
    { path: '/restore', name: 'restore', component: CubeHome, props: { mode: 'editor' } },
    { path: '/login', name: 'login', component: AuthPage, props: { mode: 'login' }, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: AuthPage, props: { mode: 'register' }, meta: { guestOnly: true } },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
})

router.beforeEach(async (to) => {
  if (!to.meta.guestOnly) return
  const auth = useAuthStore()
  await auth.restoreSession()
  if (auth.authenticated) return { name: 'home' }
})

export default router
