<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated style="background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%)">
      <q-toolbar>
        <q-btn flat dense round icon="menu" color="white" @click="drawer = !drawer" />

        <div class="row items-center q-ml-sm q-gutter-sm">
          <img src="/logo.png" style="height: 36px; width: 36px; object-fit: contain; border-radius: 8px;" />
          <q-toolbar-title class="text-white text-weight-bold" style="font-size: 18px;">
            Centro de Soporte
          </q-toolbar-title>
        </div>

        <q-space />

        <div class="row items-center q-gutter-sm q-mr-sm">
          <q-chip color="white" text-color="primary" dense icon="store" class="text-weight-medium">
            {{ authStore.profile?.sucursales?.nombre || 'Admin' }}
          </q-chip>
        </div>

        <q-btn flat round :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" color="white"
          @click="toggleDark">
          <q-tooltip>{{ $q.dark.isActive ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
        </q-btn>

        <q-btn flat round icon="account_circle" color="white">
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 200px">
              <q-item class="bg-primary">
                <q-item-section avatar>
                  <q-avatar color="white" text-color="primary" size="40px" font-size="18px">
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

    <q-drawer v-model="drawer" show-if-above :width="250" bordered>
      <q-scroll-area class="fit">

        <!-- Encabezado sidebar -->
        <div class="sidebar-header row items-center justify-center q-pa-lg"
          style="background: linear-gradient(160deg, #1565C0 0%, #1976D2 100%)">
          <div class="text-center">
            <div class="text-white text-weight-bold" style="font-size: 16px;">Centro de Soporte</div>
          </div>
        </div>

        <q-separator />

        <q-list padding>
          <q-item-label header class="text-grey-6 text-caption text-weight-bold" style="letter-spacing: 1px">
            MENÚ PRINCIPAL
          </q-item-label>

          <q-item clickable v-ripple to="/dashboard" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>Dashboard</q-item-section>
          </q-item>

          <q-item clickable v-ripple to="/tickets" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar>
              <q-icon name="confirmation_number" />
            </q-item-section>
            <q-item-section>Mis Reportes</q-item-section>
          </q-item>

          <q-item v-if="authStore.profile?.rol !== 'soporte'"
            clickable v-ripple to="/tickets/nuevo" active-class="item-active" class="rounded-borders q-mb-xs">
            <q-item-section avatar>
              <q-icon name="add_circle" />
            </q-item-section>
            <q-item-section>Nuevo Reporte</q-item-section>
          </q-item>

          <template v-if="authStore.profile?.rol === 'admin'">
            <q-separator class="q-my-md" />
            <q-item-label header class="text-grey-6 text-caption text-weight-bold" style="letter-spacing: 1px">
              ADMINISTRACIÓN
            </q-item-label>
            <q-item clickable v-ripple to="/admin" active-class="item-active" class="rounded-borders q-mb-xs">
              <q-item-section avatar>
                <q-icon name="admin_panel_settings" />
              </q-item-section>
              <q-item-section>Panel Admin</q-item-section>
            </q-item>
          </template>
        </q-list>

        <!-- Pie del drawer -->
        <div class="absolute-bottom q-pa-md" style="border-top: 1px solid rgba(128,128,128,0.2)">
          <div class="row items-center q-gutter-sm">
            <q-avatar color="primary" text-color="white" size="34px">
              {{ authStore.profile?.nombre?.charAt(0)?.toUpperCase() }}
            </q-avatar>
            <div>
              <div class="text-body2 text-weight-medium">{{ authStore.profile?.nombre }}</div>
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
  min-height: 100px;
}
</style>
