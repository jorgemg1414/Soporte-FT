<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated style="background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%)">
      <q-toolbar>
        <q-btn flat dense round icon="menu" color="white" @click="drawer = !drawer" />

        <div class="row items-center q-ml-xs q-gutter-xs">
          <img src="/logo.png" style="height: 32px; width: 32px; object-fit: contain; border-radius: 6px;" />
          <q-toolbar-title class="text-white text-weight-bold" style="font-size: 16px; padding: 0">
            Centro de Soporte
          </q-toolbar-title>
        </div>

        <q-space />

        <q-chip v-if="authStore.profile?.sucursales?.nombre"
          color="white" text-color="primary" dense icon="store" class="text-weight-medium q-mr-xs" style="font-size: 11px">
          {{ authStore.profile.sucursales.nombre }}
        </q-chip>

        <q-btn flat round :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" color="white" @click="toggleDark" size="sm">
          <q-tooltip>{{ $q.dark.isActive ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
        </q-btn>

        <q-btn flat round icon="account_circle" color="white" size="sm">
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 200px">
              <q-item class="bg-primary">
                <q-item-section avatar>
                  <q-avatar color="white" text-color="primary" size="38px" font-size="16px">
                    {{ authStore.profile?.nombre?.charAt(0)?.toUpperCase() }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-white text-weight-bold">{{ authStore.profile?.nombre }}</q-item-label>
                  <q-item-label caption class="text-blue-2">{{ getRolLabel(authStore.profile?.rol) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="handleLogout">
                <q-item-section avatar><q-icon name="logout" color="negative" /></q-item-section>
                <q-item-section>Cerrar sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above :width="240" bordered>
      <q-scroll-area class="fit">

        <div class="sidebar-header row items-center justify-center q-pa-md"
          style="background: linear-gradient(160deg, #1565C0 0%, #1976D2 100%)">
          <div class="text-center">
            <div class="text-white text-weight-bold" style="font-size: 15px;">Centro de Soporte</div>
            <div class="text-blue-2 text-caption">{{ getRolLabel(authStore.profile?.rol) }}</div>
          </div>
        </div>

        <q-separator />

        <!-- MENÚ ENCARGADA -->
        <q-list padding v-if="authStore.profile?.rol === 'encargada'">
          <q-item-label header class="text-grey-6 text-caption text-weight-bold" style="letter-spacing: 1px">
            MENÚ
          </q-item-label>
          <q-item clickable v-ripple to="/sucursal" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar><q-icon name="add_circle" /></q-item-section>
            <q-item-section>Nuevo Reporte</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/tickets" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar><q-icon name="confirmation_number" /></q-item-section>
            <q-item-section>Todos mis Reportes</q-item-section>
          </q-item>
        </q-list>

        <!-- MENÚ ADMIN / SOPORTE -->
        <q-list padding v-else>
          <q-item-label header class="text-grey-6 text-caption text-weight-bold" style="letter-spacing: 1px">
            MENÚ PRINCIPAL
          </q-item-label>
          <q-item clickable v-ripple to="/panel" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar><q-icon name="speed" /></q-item-section>
            <q-item-section>Panel Rápido</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/tickets" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar><q-icon name="confirmation_number" /></q-item-section>
            <q-item-section>Todos los Reportes</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/dashboard" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar><q-icon name="bar_chart" /></q-item-section>
            <q-item-section>Estadísticas</q-item-section>
          </q-item>

          <template v-if="authStore.profile?.rol === 'admin'">
            <q-separator class="q-my-md" />
            <q-item-label header class="text-grey-6 text-caption text-weight-bold" style="letter-spacing: 1px">
              ADMINISTRACIÓN
            </q-item-label>
            <q-item clickable v-ripple to="/admin" active-class="item-active" class="rounded-borders q-mb-xs">
              <q-item-section avatar><q-icon name="admin_panel_settings" /></q-item-section>
              <q-item-section>Panel Admin</q-item-section>
            </q-item>
          </template>
        </q-list>

        <!-- Pie del drawer -->
        <div class="absolute-bottom q-pa-sm" style="border-top: 1px solid rgba(128,128,128,0.2)">
          <div class="row items-center q-gutter-sm">
            <q-avatar color="primary" text-color="white" size="30px" font-size="13px">
              {{ authStore.profile?.nombre?.charAt(0)?.toUpperCase() }}
            </q-avatar>
            <div>
              <div class="text-body2 text-weight-medium" style="font-size: 13px">{{ authStore.profile?.nombre }}</div>
              <div class="text-caption text-grey-6">{{ getRolLabel(authStore.profile?.rol) }}</div>
            </div>
          </div>
        </div>

      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useQuasar } from 'quasar'

const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()
const drawer = ref(false)

function toggleDark() {
  $q.dark.toggle()
  localStorage.setItem('darkMode', $q.dark.isActive)
}

function getRolLabel(rol) {
  return { admin: 'Administrador', encargada: 'Encargada', soporte: 'Soporte Técnico' }[rol] || ''
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.item-active {
  color: #1976D2 !important;
  background: linear-gradient(90deg, rgba(25,118,210,0.12) 0%, rgba(25,118,210,0.04) 100%);
  border-left: 3px solid #1976D2;
  border-radius: 4px;
}
.sidebar-header {
  min-height: 80px;
}
</style>
