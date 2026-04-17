<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md" :class="$q.dark.isActive ? 'select-bg-dark' : 'select-bg-light'">
        <div style="width: 100%; max-width: 480px">

          <!-- Header con toggle dark mode -->
          <div class="row justify-end q-mb-sm">
            <q-btn flat round :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
              :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" size="sm" @click="toggleDark">
              <q-tooltip>{{ $q.dark.isActive ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
            </q-btn>
          </div>

          <!-- Logo / título -->
          <div class="text-center q-mb-lg">
            <img src="/logo.png" style="height: 64px; width: 64px; object-fit: contain; border-radius: 14px" class="q-mb-sm" />
            <div class="text-h5 text-weight-bold text-primary">Centro de Soporte</div>
            <div class="text-caption q-mt-xs" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              Selecciona tu sucursal para continuar
            </div>
          </div>

          <!-- Sucursal recordada -->
          <q-card v-if="ultimaSucursal && !cambiando"
            bordered class="q-mb-md recordada-card" clickable
            @click="pedirPassword(ultimaSucursal)">
            <q-card-section class="row items-center q-pa-md">
              <q-avatar color="primary" text-color="white" size="48px" icon="store" class="q-mr-md" />
              <div class="col">
                <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">Continuar como</div>
                <div class="text-h6 text-weight-bold text-primary">{{ ultimaSucursal.nombre }}</div>
              </div>
              <q-icon name="chevron_right" color="primary" size="28px" />
            </q-card-section>
            <q-inner-loading :showing="cargandoId === ultimaSucursal.id">
              <q-spinner color="primary" size="30px" />
            </q-inner-loading>
          </q-card>

          <!-- Botón cambiar -->
          <div v-if="ultimaSucursal && !cambiando" class="text-center q-mb-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-4' : 'grey-6'"
              label="Cambiar sucursal" icon="swap_horiz" size="sm"
              @click="cambiando = true" />
          </div>

          <!-- Lista de sucursales -->
          <q-card bordered v-if="!ultimaSucursal || cambiando">
            <q-card-section class="q-pb-xs">
              <q-input v-model="busqueda" outlined dense placeholder="Buscar sucursal..." clearable>
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </q-card-section>

            <q-list separator style="max-height: 380px; overflow-y: auto">
              <q-item v-if="cargando" class="flex flex-center q-pa-lg">
                <q-spinner color="primary" />
              </q-item>

              <q-item v-for="suc in sucursalesFiltradas" :key="suc.id"
                clickable v-ripple @click="pedirPassword(suc)" class="q-py-sm">
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" size="36px" icon="store" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ suc.nombre }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-spinner v-if="cargandoId === suc.id" color="primary" size="20px" />
                  <q-icon v-else name="chevron_right" :color="$q.dark.isActive ? 'grey-6' : 'grey-4'" />
                </q-item-section>
              </q-item>

              <q-item v-if="!cargando && sucursalesFiltradas.length === 0">
                <q-item-section class="text-center text-grey-5 q-py-md">
                  Sin resultados para "{{ busqueda }}"
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>

          <!-- Link acceso sistemas -->
          <div class="text-center q-mt-lg">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-6'"
              label="Acceso para Sistemas" icon="admin_panel_settings"
              size="sm" to="/login" />
          </div>

        </div>
      </q-page>
    </q-page-container>

    <!-- Diálogo de contraseña -->
    <q-dialog v-model="dialogPassword" persistent>
      <q-card style="min-width: 320px; border-radius: 16px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar color="primary" text-color="white" icon="lock" size="40px" class="q-mr-sm" />
          <div>
            <div class="text-h6 text-weight-bold">Contraseña requerida</div>
            <div class="text-caption text-grey-6">{{ sucursalSeleccionada?.nombre }}</div>
          </div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="confirmarPassword">
            <!-- Campo oculto para que el gestor de contraseñas asocie usuario + contraseña -->
            <input type="text" name="username"
              :value="sucursalSeleccionada?.nombre"
              autocomplete="username"
              style="display:none" readonly />
            <q-input
              v-model="passwordInput"
              outlined
              label="Contraseña de sucursal"
              :type="mostrarPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              autofocus
              :error="!!errorPassword"
              :error-message="errorPassword"
              @update:model-value="errorPassword = ''"
            >
              <template #append>
                <q-icon
                  :name="mostrarPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="mostrarPassword = !mostrarPassword"
                />
              </template>
            </q-input>
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancelar" color="grey-6" v-close-popup @click="resetDialog" />
          <q-btn unelevated label="Entrar" color="primary" icon="login"
            :loading="cargandoId !== null" @click="confirmarPassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useQuasar } from 'quasar'
import api from '../lib/api'

const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const sucursales = ref([])
const cargando = ref(true)
const cargandoId = ref(null)
const busqueda = ref('')
const cambiando = ref(false)
const ultimaSucursal = ref(null)

const dialogPassword = ref(false)
const sucursalSeleccionada = ref(null)
const passwordInput = ref('')
const mostrarPassword = ref(false)
const errorPassword = ref('')

const STORAGE_KEY = 'last_sucursal'

const sucursalesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return sucursales.value
  return sucursales.value.filter(s => s.nombre.toLowerCase().includes(q))
})

function toggleDark() {
  $q.dark.toggle()
  localStorage.setItem('darkMode', $q.dark.isActive)
}

onMounted(async () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) ultimaSucursal.value = JSON.parse(saved)
  } catch { /* ignorar */ }

  try {
    const { data } = await api.get('/sucursales')
    sucursales.value = data || []
  } catch { /* silencioso */ }
  finally { cargando.value = false }
})

function pedirPassword(suc) {
  sucursalSeleccionada.value = suc
  passwordInput.value = ''
  errorPassword.value = ''
  mostrarPassword.value = false
  dialogPassword.value = true
}

function resetDialog() {
  sucursalSeleccionada.value = null
  passwordInput.value = ''
  errorPassword.value = ''
}

async function confirmarPassword() {
  if (!passwordInput.value) {
    errorPassword.value = 'Ingresa la contraseña'
    return
  }
  const suc = sucursalSeleccionada.value
  cargandoId.value = suc.id
  try {
    const { data } = await api.post('/auth/sucursal-login', { sucursal_id: suc.id, password: passwordInput.value })
    dialogPassword.value = false
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: suc.id, nombre: suc.nombre }))

    authStore.user    = { id: data.user.id, email: null }
    authStore.profile = {
      id:          data.user.id,
      nombre:      data.user.nombre,
      rol:         data.user.rol,
      sucursal_id: data.user.sucursal_id,
      sucursales:  { nombre: data.user.sucursal_nombre }
    }
    authStore.initialized = true

    await router.push('/sucursal')
  } catch (e) {
    const msg = e.response?.data?.error || e.message
    if (e.response?.status === 401) {
      errorPassword.value = 'Contraseña incorrecta'
    } else {
      $q.notify({ type: 'negative', message: 'Error al ingresar: ' + msg })
    }
    cargandoId.value = null
  }
}
</script>

<style scoped>
.select-bg-light {
  min-height: 100vh;
  background: linear-gradient(160deg, #eef2f7 0%, #e8edf5 50%, #f2f5f9 100%);
}
.select-bg-dark {
  min-height: 100vh;
  background: linear-gradient(160deg, #0a1628 0%, #0f1f38 45%, #162840 100%);
}
.recordada-card {
  border: 2px solid var(--theme-primary, #1976D2) !important;
  border-radius: 14px !important;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.recordada-card:hover { box-shadow: 0 4px 20px rgba(25, 118, 210, 0.2) !important; }
</style>
