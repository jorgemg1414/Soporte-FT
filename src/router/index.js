import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        component: () => import('../pages/DashboardPage.vue')
      },
      {
        path: 'tickets',
        component: () => import('../pages/TicketsPage.vue')
      },
      {
        path: 'tickets/nuevo',
        component: () => import('../pages/NuevoTicketPage.vue'),
        meta: { roles: ['encargada', 'admin'] }
      },
      {
        path: 'tickets/:id',
        component: () => import('../pages/TicketDetallePage.vue')
      },
      {
        path: 'admin',
        component: () => import('../pages/AdminPage.vue'),
        meta: { roles: ['admin'] }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    try {
      await authStore.init()
    } catch {
      authStore.initialized = true
    }
  }

  if (to.meta.public) {
    if (authStore.user) return '/dashboard'
    return true
  }

  if (!authStore.user) return '/login'

  if (to.meta.roles && !to.meta.roles.includes(authStore.profile?.rol)) {
    return '/dashboard'
  }

  return true
})

export default router
