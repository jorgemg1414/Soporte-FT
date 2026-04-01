<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <div>
        <div class="text-h5 text-white text-weight-bold">Buzón de Sugerencias</div>
        <div class="text-blue-2 text-caption q-mt-xs">Comparte tus ideas para mejorar el sistema</div>
      </div>
      <q-space />
      <q-btn color="white" text-color="primary" icon="add" label="Nueva Sugerencia"
        unelevated style="border-radius: 10px" @click="dialogNueva = true" />
    </div>

    <q-card bordered>
      <q-list separator>
        <q-item v-for="s in sugerencias" :key="s.id" class="q-py-md">
          <q-item-section avatar top>
            <q-icon :name="getEstadoIcon(s.estado)" :color="getEstadoColor(s.estado)" size="28px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="row items-center q-gutter-xs q-mb-xs">
              <q-badge :color="getEstadoColor(s.estado)" dense>{{ getEstadoLabel(s.estado) }}</q-badge>
              <span class="text-grey-6 text-caption">{{ s.sucursal_nombre || s.sucursales?.nombre || '' }}</span>
              <span class="text-grey-5 text-caption">{{ formatDate(s.created_at) }}</span>
            </q-item-label>
            <div style="white-space: pre-wrap" class="text-body2">{{ s.contenido }}</div>
            <div v-if="s.respuesta" class="q-mt-sm q-pa-sm bg-green-1" style="border-radius: 8px; border-left: 3px solid #4CAF50">
              <div class="text-caption text-positive text-weight-bold">Respuesta del equipo:</div>
              <div class="text-body2" style="white-space: pre-wrap">{{ s.respuesta }}</div>
            </div>
          </q-item-section>
          <q-item-section side v-if="esSoporte">
            <q-btn flat round icon="reply" color="primary" size="sm" @click="abrirResponder(s)">
              <q-tooltip>Responder</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
        <q-item v-if="sugerencias.length === 0 && !cargando">
          <q-item-section class="text-center text-grey-5 q-py-lg">
            No hay sugerencias aún. Sé el primero en compartir una idea.
          </q-item-section>
        </q-item>
      </q-list>
      <q-inner-loading :showing="cargando" />
    </q-card>

    <!-- Dialog nueva sugerencia -->
    <q-dialog v-model="dialogNueva" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Nueva Sugerencia</div>
          <div class="text-caption text-grey-6">Tu sugerencia será revisada por el equipo de soporte</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="nuevaSugerencia" outlined type="textarea" rows="4"
            label="Escribe tu sugerencia, idea o recomendación..."
            :rules="[v => !!v?.trim() || 'Requerido', v => v.length <= 300 || 'Máximo 300 caracteres']"
            counter maxlength="300" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Enviar" unelevated :loading="guardando"
            :disable="!nuevaSugerencia.trim()" @click="enviarSugerencia" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog responder (soporte/admin) -->
    <q-dialog v-model="dialogResponder" persistent>
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">Responder Sugerencia</div>
          <div class="text-body2 q-mt-sm" style="white-space: pre-wrap; background: #f5f5f5; padding: 8px; border-radius: 6px">
            {{ sugerenciaActual?.contenido }}
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="respuestaTexto" outlined type="textarea" rows="3" label="Respuesta..." maxlength="300" counter />
          <q-select v-model="respuestaEstado" outlined dense label="Cambiar estado"
            :options="estadosOptions" emit-value map-options />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Responder" unelevated :loading="guardando"
            :disable="!respuestaTexto.trim()" @click="responderSugerencia" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../lib/api'
import { useQuasar } from 'quasar'
import { formatDate } from '../composables/useTicketHelpers'

const authStore = useAuthStore()
const $q = useQuasar()

const sugerencias = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogNueva = ref(false)
const nuevaSugerencia = ref('')
const dialogResponder = ref(false)
const sugerenciaActual = ref(null)
const respuestaTexto = ref('')
const respuestaEstado = ref('revisada')

const esSoporte = computed(() => authStore.profile?.rol === 'soporte' || authStore.profile?.rol === 'admin')

const estadosOptions = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Revisada', value: 'revisada' },
  { label: 'Implementada', value: 'implementada' },
  { label: 'Descartada', value: 'descartada' }
]

onMounted(async () => {
  cargando.value = true
  try {
    const { data } = await api.get('/sugerencias')
    sugerencias.value = data || []
  } finally {
    cargando.value = false
  }
})

async function enviarSugerencia() {
  guardando.value = true
  try {
    const { data } = await api.post('/sugerencias', { contenido: nuevaSugerencia.value.trim() })
    sugerencias.value.unshift(data)
    dialogNueva.value = false
    nuevaSugerencia.value = ''
    $q.notify({ type: 'positive', message: 'Sugerencia enviada correctamente' })
  } catch {
    $q.notify({ type: 'negative', message: 'Error al enviar la sugerencia' })
  } finally {
    guardando.value = false
  }
}

function abrirResponder(s) {
  sugerenciaActual.value = s
  respuestaTexto.value = s.respuesta || ''
  respuestaEstado.value = s.estado === 'pendiente' ? 'revisada' : s.estado
  dialogResponder.value = true
}

async function responderSugerencia() {
  guardando.value = true
  try {
    const { data } = await api.put(`/sugerencias/${sugerenciaActual.value.id}/responder`, {
      respuesta: respuestaTexto.value.trim(),
      estado: respuestaEstado.value
    })
    const idx = sugerencias.value.findIndex(s => s.id === sugerenciaActual.value.id)
    if (idx !== -1) sugerencias.value[idx] = data
    dialogResponder.value = false
    $q.notify({ type: 'positive', message: 'Respuesta guardada' })
  } catch {
    $q.notify({ type: 'negative', message: 'Error al responder' })
  } finally {
    guardando.value = false
  }
}

function getEstadoColor(e) {
  return { pendiente: 'warning', revisada: 'info', implementada: 'positive', descartada: 'grey' }[e] || 'grey'
}
function getEstadoLabel(e) {
  return { pendiente: 'Pendiente', revisada: 'Revisada', implementada: 'Implementada', descartada: 'Descartada' }[e] || e
}
function getEstadoIcon(e) {
  return { pendiente: 'schedule', revisada: 'visibility', implementada: 'check_circle', descartada: 'cancel' }[e] || 'help'
}

</script>

<style scoped>
</style>
