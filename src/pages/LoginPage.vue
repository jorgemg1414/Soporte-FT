<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center login-bg">
        <q-card class="login-card" bordered>

          <q-card-section class="text-center q-pt-xl q-pb-md">
            <div class="text-h5 text-weight-bold text-primary">Centro de Soporte</div>
            <div class="text-grey-6 q-mt-xs" style="font-size: 13px">Acceso para equipo de Sistemas</div>
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
                style="border-radius: 10px; background: linear-gradient(135deg, #1565C0, #42A5F5) !important"
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
.login-bg {
  min-height: 100vh;
}
.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
}
</style>
