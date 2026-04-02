<template>
  <q-page class="q-pa-md" v-if="ticket">
    <div class="welcome-banner row items-center q-px-md q-py-sm q-mb-md">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.push('/tickets')" />
      <div class="q-ml-sm col">
        <q-breadcrumbs active-color="white" class="q-mb-xs" separator-color="blue-3" style="font-size: 12px">
          <q-breadcrumbs-el label="Reportes" to="/tickets" class="text-blue-3" style="cursor:pointer" />
          <q-breadcrumbs-el :label="ticket.folio" class="text-white text-weight-bold" />
        </q-breadcrumbs>
        <div class="text-blue-2 text-caption">
          {{ ticket.sucursales?.nombre }} · {{ ticket.profiles?.nombre }} · {{ formatDate(ticket.created_at) }}
        </div>
      </div>
      <div class="row q-gutter-xs items-center">
        <q-badge v-if="ticket.urgente" color="negative" style="font-size: 12px; padding: 5px 10px; border-radius: 20px">
          <q-icon name="warning" size="13px" class="q-mr-xs" />urgente
        </q-badge>
        <q-badge :color="getEstadoColor(ticket.estado)" style="font-size: 13px; padding: 6px 14px; border-radius: 20px">
          {{ getEstadoLabel(ticket.estado) }}
        </q-badge>
        <q-btn v-if="authStore.profile?.rol === 'admin'"
          flat round icon="delete" color="white" size="sm"
          @click="confirmarEliminar">
          <q-tooltip>Eliminar ticket</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Columna lateral primero en móvil si es soporte/admin -->
      <div class="col-12 col-md-4 order-last order-md-first"
        v-if="authStore.profile?.rol === 'soporte' || authStore.profile?.rol === 'admin'">
        <q-card bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Gestionar Ticket</div>
            <div class="row q-gutter-xs q-mb-sm">
              <q-btn v-for="accion in accionesEstado" :key="accion.value"
                :label="accion.label" :color="accion.color" :icon="accion.icon"
                unelevated class="col"
                :loading="cambiandoEstado" @click="cambiarEstado(accion.value)"
                size="sm" />
            </div>
            <q-btn
              :label="ticket.urgente ? 'Quitar urgencia' : 'Marcar como urgente'"
              :color="ticket.urgente ? 'grey-6' : 'negative'"
              :icon="ticket.urgente ? 'flag' : 'outlined_flag'"
              unelevated class="full-width q-mb-sm"
              :loading="marcandoUrgente" @click="toggleUrgente"
              size="sm" />

            <q-separator class="q-my-sm" />
            <div class="text-subtitle2 q-mb-xs">Asignar Técnico</div>
            <q-select v-model="tecnicoSeleccionado" outlined dense
              :options="tecnicos" option-value="id" option-label="nombre"
              emit-value map-options clearable label="Técnico asignado"
              @update:model-value="asignarTecnico">
              <template #prepend><q-icon name="engineering" /></template>
            </q-select>
          </q-card-section>
        </q-card>

        <q-card bordered>
          <q-card-section>
            <div class="text-h6 q-mb-sm"><q-icon name="history" class="q-mr-xs" color="primary" />Historial</div>
          </q-card-section>
          <q-separator />
          <q-timeline color="primary" class="q-pa-md">
            <q-timeline-entry v-for="h in historial" :key="h.id" :subtitle="formatDate(h.created_at)">
              <template #title>
                <span class="text-body2 text-weight-medium">{{ h.accion }}</span>
              </template>
              <div class="text-grey-6 text-caption">{{ h.detalle }}</div>
            </q-timeline-entry>
            <q-timeline-entry v-if="historial.length === 0">
              <template #title><span class="text-grey-5">Sin historial</span></template>
            </q-timeline-entry>
          </q-timeline>
        </q-card>
      </div>

      <!-- Columna principal -->
      <div class="col-12 col-md-8"
        :class="authStore.profile?.rol === 'soporte' || authStore.profile?.rol === 'admin' ? '' : 'col-md-12'">
        <q-card bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <q-icon :name="getCategoryIcon(ticket.categoria)" color="primary" size="32px" class="q-mr-md" />
              <div>
                <div class="text-h6">{{ getCategoryLabel(ticket.categoria) }}</div>
                <div class="text-caption text-grey-6">Categoría del ticket</div>
              </div>
            </div>

            <template v-if="ticket.categoria === 'cancelacion_documento'">
              <div class="row q-col-gutter-md q-mb-md">
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey-6">Tipo de documento</div>
                  <div class="text-body1 text-weight-medium">{{ getTipoDocLabel(ticket.tipo_documento) }}</div>
                </div>
                <div class="col-12 col-sm-4" v-if="ticket.tipo_traspaso">
                  <div class="text-caption text-grey-6">Tipo de traspaso</div>
                  <div class="text-body1 text-weight-medium" style="text-transform: capitalize">{{ ticket.tipo_traspaso }}</div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey-6">Folio a cancelar</div>
                  <div class="text-negative text-body1 text-weight-bold">{{ ticket.folio_pvwin || '—' }}</div>
                </div>
                <div class="col-12 col-sm-4" v-if="ticket.folio_correcto">
                  <div class="text-caption text-grey-6">Folio correcto</div>
                  <div class="text-positive text-body1 text-weight-bold">{{ ticket.folio_correcto }}</div>
                </div>
              </div>
            </template>

            <template v-if="ticket.categoria === 'falla_pvwin' || ticket.categoria === 'falla_computadora'">
              <div v-if="ticket.tipo_falla" class="q-mb-sm">
                <div class="text-caption text-grey-6">Tipo de falla</div>
                <div class="text-body1">{{ ticket.tipo_falla }}</div>
              </div>
              <div v-if="ticket.folio_pvwin" class="q-mb-sm">
                <div class="text-caption text-grey-6">Folio afectado</div>
                <div class="text-body1 text-weight-bold">{{ ticket.folio_pvwin }}</div>
              </div>
              <div>
                <div class="text-caption text-grey-6">Descripción de la falla</div>
                <div class="text-body1 q-mt-xs" style="white-space: pre-wrap">{{ ticket.detalle_falla }}</div>
              </div>
            </template>

            <template v-if="ticket.categoria === 'otro' && ticket.detalle_falla">
              <div class="text-caption text-grey-6">Descripción</div>
              <div class="text-body1 q-mt-xs" style="white-space: pre-wrap">{{ ticket.detalle_falla }}</div>
            </template>

            <template v-if="ticket.descripcion">
              <q-separator class="q-my-md" />
              <div class="text-caption text-grey-6">
                {{ ticket.categoria === 'cancelacion_documento' ? 'Motivo de la cancelación' : 'Observaciones adicionales' }}
              </div>
              <div class="text-body1 q-mt-xs" style="white-space: pre-wrap">{{ ticket.descripcion }}</div>
            </template>
          </q-card-section>
        </q-card>

        <!-- Notas Internas (solo soporte/admin) -->
        <q-card bordered class="q-mb-md"
          v-if="authStore.profile?.rol === 'soporte' || authStore.profile?.rol === 'admin'">
          <q-card-section>
            <div class="text-h6"><q-icon name="lock" class="q-mr-xs" color="orange" />Notas Internas</div>
            <div class="text-caption text-grey-6">Solo visible para el equipo de soporte</div>
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="nota in notasInternas" :key="nota.id" class="q-py-sm">
              <q-item-section avatar top>
                <q-avatar color="orange" text-color="white" size="32px">
                  {{ nota.profiles?.nombre?.charAt(0)?.toUpperCase() }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="row items-center q-gutter-xs">
                  <span class="text-weight-medium">{{ nota.profiles?.nombre }}</span>
                  <span class="text-grey-6 text-caption">{{ formatDate(nota.created_at) }}</span>
                </q-item-label>
                <div class="q-mt-xs" style="white-space: pre-wrap">{{ nota.contenido }}</div>
              </q-item-section>
            </q-item>
            <q-item v-if="notasInternas.length === 0">
              <q-item-section class="text-center text-grey-5 q-py-sm">Sin notas internas</q-item-section>
            </q-item>
          </q-list>
          <q-separator />
          <q-card-section>
            <q-input v-model="nuevaNota" outlined label="Agregar nota interna..." type="textarea" rows="2" dense maxlength="300" counter>
              <template #append>
                <q-btn flat round icon="send" color="orange"
                  :disable="!nuevaNota.trim()" :loading="enviandoNota" @click="enviarNota" />
              </template>
            </q-input>
          </q-card-section>
        </q-card>

        <!-- Comentarios -->
        <q-card bordered>
          <q-card-section>
            <div class="text-h6"><q-icon name="chat" class="q-mr-xs" color="primary" />Comentarios</div>
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="com in comentarios" :key="com.id" class="q-py-md">
              <q-item-section avatar top>
                <q-avatar :color="getRolColor(com.profiles?.rol)" text-color="white" size="38px">
                  {{ com.profiles?.nombre?.charAt(0)?.toUpperCase() }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="row items-center q-gutter-xs">
                  <span class="text-weight-medium">{{ com.profiles?.nombre }}</span>
                  <q-badge :color="getRolColor(com.profiles?.rol)" dense>{{ getRolLabel(com.profiles?.rol) }}</q-badge>
                  <span class="text-grey-6 text-caption">{{ formatDate(com.created_at) }}</span>
                </q-item-label>
                <div class="q-mt-xs" style="white-space: pre-wrap">{{ com.contenido }}</div>
              </q-item-section>
            </q-item>
            <q-item v-if="comentarios.length === 0">
              <q-item-section class="text-center text-grey-5 q-py-md">Sin comentarios aún</q-item-section>
            </q-item>
          </q-list>
          <q-separator />
          <q-card-section>
            <q-input v-model="nuevoComentario" outlined label="Escribir comentario..." type="textarea" rows="2" maxlength="300" counter>
              <template #append>
                <q-btn flat round icon="send" color="primary"
                  :disable="!nuevoComentario.trim()" :loading="enviando" @click="enviarComentario" />
              </template>
            </q-input>
          </q-card-section>
        </q-card>

        <!-- Tickets relacionados -->
        <q-card bordered v-if="relacionados.length > 0" class="q-mt-md">
          <q-card-section class="q-pb-xs">
            <div class="row items-center q-gutter-xs">
              <q-icon name="link" color="orange" size="20px" />
              <div class="text-subtitle2 text-weight-bold">Tickets similares abiertos</div>
              <q-badge color="orange" :label="relacionados.length" />
            </div>
            <div class="text-caption text-grey-6">De la misma sucursal con problema parecido</div>
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="r in relacionados" :key="r.id"
              clickable v-ripple @click="$router.push(`/tickets/${r.id}`)">
              <q-item-section avatar>
                <q-icon name="confirmation_number" color="orange" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <span class="text-orange text-weight-bold">{{ r.folio }}</span>
                  <span class="q-ml-xs text-grey-7">— {{ r.titulo }}</span>
                </q-item-label>
                <q-item-label caption>{{ getCategoryLabel(r.categoria) }} · {{ formatDate(r.created_at) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="getEstadoColor(r.estado)" style="font-size: 10px">
                  {{ getEstadoLabel(r.estado) }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

      </div>

    </div>
  </q-page>

  <q-page v-else class="flex flex-center">
    <q-spinner color="primary" size="60px" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import api from '../lib/api'
import { useQuasar } from 'quasar'
import { getEstadoColor, getEstadoLabel, getCategoryIcon, getCategoryLabel, getTipoDocLabel, getRolColor, getRolLabel, formatDate } from '../composables/useTicketHelpers'


const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const ticketsStore = useTicketsStore()
const $q = useQuasar()

const ticket = ref(null)
const comentarios = ref([])
const historial = ref([])
const notasInternas = ref([])
const tecnicos = ref([])
const tecnicoSeleccionado = ref(null)
const nuevoComentario = ref('')
const nuevaNota = ref('')
const enviando = ref(false)
const enviandoNota = ref(false)
const cambiandoEstado = ref(false)
const marcandoUrgente = ref(false)
const relacionados = ref([])

const todasAcciones = [
  { label: 'En Proceso', value: 'en_proceso', color: 'info',     icon: 'sync' },
  { label: 'Resuelto',   value: 'resuelto',   color: 'positive', icon: 'check_circle' },
  { label: 'Cerrar',     value: 'cerrado',    color: 'grey-7',   icon: 'lock' },
  { label: 'Reabrir',    value: 'abierto',    color: 'warning',  icon: 'lock_open' }
]

const transiciones = {
  abierto:    ['en_proceso', 'resuelto', 'cerrado'],
  en_proceso: ['resuelto', 'cerrado', 'abierto'],
  resuelto:   ['cerrado', 'abierto'],
  cerrado:    ['abierto']
}

const accionesEstado = computed(() => {
  const validas = transiciones[ticket.value?.estado] || []
  return todasAcciones.filter(a => validas.includes(a.value))
})

onMounted(loadAll)

async function loadAll() {
  const id = route.params.id
  const esSoporte = authStore.profile?.rol === 'soporte' || authStore.profile?.rol === 'admin'

  const promises = [
    api.get(`/tickets/${id}`).catch(e => { console.error('Error loading ticket:', e); return { data: null } }),
    api.get(`/tickets/${id}/comentarios`).catch(() => ({ data: [] })),
    api.get(`/tickets/${id}/historial`).catch(() => ({ data: [] }))
  ]
  if (esSoporte) {
    promises.push(api.get(`/tickets/${id}/notas`).catch(() => ({ data: [] })))
    promises.push(api.get('/usuarios/tecnicos').catch(() => ({ data: [] })))
  }

  const results = await Promise.all(promises)

  ticket.value      = results[0].data
  if (!ticket.value) {
    $q.notify({ type: 'negative', message: 'No se pudo cargar el ticket' })
    return
  }
  comentarios.value = results[1].data || []
  historial.value   = results[2].data || []

  if (esSoporte) {
    notasInternas.value = results[3].data || []
    tecnicos.value = results[4].data || []
    tecnicoSeleccionado.value = ticket.value.asignado_a || null
  }

  // Buscar tickets relacionados (solo si el ticket sigue abierto)
  if (['abierto', 'en_proceso'].includes(ticket.value.estado)) {
    try {
      const texto = `${ticket.value.descripcion || ''} ${ticket.value.detalle_falla || ''}`.trim()
      const { data: dup } = await api.post('/tickets/check-duplicados', {
        titulo: ticket.value.titulo,
        descripcion: texto,
        categoria: ticket.value.categoria,
        sucursal_id: ticket.value.sucursal_id
      })
      // Excluir el ticket actual de los relacionados
      relacionados.value = (dup.duplicados || []).filter(r => r.id !== ticket.value.id)
    } catch { /* silencioso */ }
  } else {
    relacionados.value = []
  }
}

async function enviarComentario() {
  if (!nuevoComentario.value.trim()) return
  enviando.value = true
  try {
    const com = await ticketsStore.agregarComentario(route.params.id, nuevoComentario.value.trim())
    comentarios.value.push(com)
    nuevoComentario.value = ''
  } catch {
    $q.notify({ type: 'negative', message: 'Error al enviar el comentario' })
  } finally {
    enviando.value = false
  }
}

async function enviarNota() {
  if (!nuevaNota.value.trim()) return
  enviandoNota.value = true
  try {
    const { data } = await api.post(`/tickets/${route.params.id}/notas`, { contenido: nuevaNota.value.trim() })
    notasInternas.value.push(data)
    nuevaNota.value = ''
  } catch {
    $q.notify({ type: 'negative', message: 'Error al crear nota interna' })
  } finally {
    enviandoNota.value = false
  }
}

async function asignarTecnico(tecnicoId) {
  try {
    await api.put(`/tickets/${route.params.id}/asignar`, { asignado_a: tecnicoId })
    await loadAll()
    $q.notify({ type: 'positive', message: tecnicoId ? 'Técnico asignado' : 'Asignación removida' })
  } catch {
    $q.notify({ type: 'negative', message: 'Error al asignar técnico' })
  }
}

async function toggleUrgente() {
  marcandoUrgente.value = true
  const eraUrgente = ticket.value.urgente
  try {
    await api.put(`/tickets/${route.params.id}/urgente`, { urgente: !eraUrgente })
    await loadAll()
    $q.notify({ type: !eraUrgente ? 'warning' : 'positive', message: !eraUrgente ? 'Ticket marcado como urgente' : 'Urgencia removida' })
  } catch {
    $q.notify({ type: 'negative', message: 'Error al cambiar urgencia' })
  } finally {
    marcandoUrgente.value = false
  }
}

function confirmarEliminar() {
  $q.dialog({
    title: 'Eliminar ticket',
    message: `¿Eliminar el ticket <b>${ticket.value.folio}</b>? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      await api.delete(`/tickets/${ticket.value.id}`)
      $q.notify({ type: 'positive', message: `Ticket ${ticket.value.folio} eliminado` })
      router.push('/tickets')
    } catch {
      $q.notify({ type: 'negative', message: 'Error al eliminar el ticket' })
    }
  })
}

async function cambiarEstado(nuevoEstado) {
  const estadoLabels = { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }
  const confirmado = await new Promise(resolve => {
    $q.dialog({
      title: 'Cambiar estado',
      message: `¿Cambiar el estado a "${estadoLabels[nuevoEstado]}"?`,
      cancel: { label: 'Cancelar', flat: true },
      ok: { label: 'Confirmar', color: 'primary', unelevated: true },
      persistent: true
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
  if (!confirmado) return

  cambiandoEstado.value = true
  try {
    await ticketsStore.actualizarEstado(route.params.id, nuevoEstado)
    ticket.value.estado = nuevoEstado
    await loadAll()
    $q.notify({ type: 'positive', message: 'Estado actualizado correctamente' })
  } catch {
    $q.notify({ type: 'negative', message: 'Error al actualizar el estado' })
  } finally {
    cambiandoEstado.value = false
  }
}

</script>

<style scoped>
</style>
