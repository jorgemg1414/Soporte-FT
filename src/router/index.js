import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/sucursal-select',
    component: () => import('../pages/SucursalSelectPage.vue'),
    meta: { public: true }
  },
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
      {
        path: '',
        redirect: () => {
          const authStore = useAuthStore()
          const rol = authStore.profile?.rol
          if (rol === 'encargada') return '/sucursal'
          return '/panel'
        }
      },
      {
        path: 'sucursal',
        component: () => import('../pages/SucursalPage.vue'),
        meta: { roles: ['encargada'] }
      },
      {
        path: 'panel',
        component: () => import('../pages/PanelPage.vue'),
        meta: { roles: ['admin', 'soporte'] }
      },
      {
        path: 'dashboard',
        component: () => import('../pages/DashboardPage.vue'),
        meta: { roles: ['admin', 'soporte'] }
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
        path: 'sugerencias',
        component: () => import('../pages/SugerenciasPage.vue')
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
    try { await authStore.init() } catch { authStore.initialized = true }
  }

  if (to.meta.public) {
    // Si ya está autenticado, redirigir a su página
    if (authStore.user) {
      const rol = authStore.profile?.rol
      return rol === 'encargada' ? '/sucursal' : '/panel'
    }
    return true
  }

  // Sin sesión → selección de sucursal
  if (!authStore.user) return '/sucursal-select'

  if (to.meta.roles && !to.meta.roles.includes(authStore.profile?.rol)) {
    const rol = authStore.profile?.rol
    return rol === 'encargada' ? '/sucursal' : '/panel'
  }

  return true
})

export default router
