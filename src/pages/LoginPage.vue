<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page :class="['flex flex-center login-bg', $q.dark.isActive ? 'login-bg--dark' : 'login-bg--light']">
        <q-card class="login-card" bordered>

          <q-card-section class="text-center q-pt-xl q-pb-md">
            <img :src="logoUrl" alt="Farmacias Tepa" class="login-logo q-mb-sm" />
            <div class="text-grey-6" style="font-size: 13px">Centro de Soporte — Equipo de Sistemas</div>
          </q-card-section>

          <!-- Formulario -->
          <q-card-section class="q-pa-xl">
            <q-form @submit="handleLogin">
              <div class="text-caption text-grey-6 q-mb-xs text-weight-bold">USUARIO</div>
              <q-input
                v-model="usuario"
                outlined
                placeholder="Ingrese su usuario"
                name="username"
                autocomplete="username"
                class="q-mb-md"
                :rules="[val => !!val || 'El usuario es requerido']"
              >
                <template #prepend>
                  <q-icon name="person" color="primary" />
                </template>
              </q-input>

              <div class="text-caption text-grey-6 q-mb-xs text-weight-bold">CONTRASEÑA</div>
              <q-input
                v-model="password"
                outlined
                :type="showPass ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                class="q-mb-lg"
                :rules="[val => !!val || 'La contraseña es requerida']"
              >
                <template #prepend>
                  <q-icon name="lock" color="primary" />
                </template>
                <template #append>
                  <q-icon
                    :name="showPass ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer text-grey-5"
                    @click="showPass = !showPass"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                label="Iniciar sesión"
                color="primary"
                unelevated
                class="full-width"
                :loading="loading"
                size="lg"
                style="border-radius: 10px; background: linear-gradient(135deg, var(--theme-header-from, #1565C0), var(--theme-header-to, #42A5F5)) !important"
              />
            </q-form>
          </q-card-section>

        </q-card>

        <div class="text-center q-mt-md">
          <q-btn flat color="grey-5" label="Soy encargado/a de sucursal" icon="store"
            size="sm" to="/sucursal-select" />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import logoUrl from '../assets/LOGO FARMACIAS TEPA.png'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useQuasar } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const usuario = ref('')
const password = ref('')
const showPass = ref(false)
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    const data = await authStore.login(usuario.value.trim().toLowerCase(), password.value)
    const rol = data.user?.rol
    router.push(rol === 'encargada' ? '/sucursal' : '/tickets')
  } catch {
    $q.notify({ type: 'negative', message: 'Usuario o contraseña incorrectos' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Base ────────────────────────────────────────────────────────────────── */
.login-bg {
  min-height: 100vh;
  background-size: 300% 300%;
  animation: gradientShift 18s ease infinite;
  position: relative;
}

@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.login-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-size: 28px 28px;
  pointer-events: none;
}

/* ── Modo claro ──────────────────────────────────────────────────────────── */
.login-bg--light {
  background: linear-gradient(160deg, #eef2f7 0%, #e8edf5 50%, #f2f5f9 100%);
}
.login-bg--light::before {
  background-image: radial-gradient(rgba(25, 118, 210, 0.07) 1px, transparent 1px);
}

/* ── Modo oscuro ─────────────────────────────────────────────────────────── */
.login-bg--dark {
  background: linear-gradient(160deg, #0a1628 0%, #0f1f38 45%, #162840 100%);
}
.login-bg--dark::before {
  background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
}

/* ── Card ────────────────────────────────────────────────────────────────── */
.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 20px !important;
  overflow: hidden;
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
}

.login-card {
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
}

/* ── Logo ────────────────────────────────────────────────────────────────── */
.login-logo {
  width: 180px;
  display: block;
  margin: 0 auto;
}

.login-logo {
  mix-blend-mode: multiply;
}

.login-card :deep(.q-field__native),
.login-card :deep(.q-field__input),
.login-card :deep(.q-field__label) {
  color: #212121 !important;
}
.login-card :deep(.q-field--outlined .q-field__control) {
  color: #212121 !important;
}
</style>
