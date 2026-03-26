<template>
  <q-page class="q-pa-md" v-if="ticket">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" />
      <div class="q-ml-sm col">
        <div class="text-h5 text-white text-weight-bold">{{ ticket.folio }}</div>
        <div class="text-blue-2 text-caption q-mt-xs">
          {{ ticket.sucursales?.nombre }} · {{ ticket.profiles?.nombre }} · {{ formatDate(ticket.created_at) }}
        </div>
      </div>
      <q-badge :color="getEstadoColor(ticket.estado)" style="font-size: 13px; padding: 6px 14px; border-radius: 20px">
        {{ getEstadoLabel(ticket.estado) }}
      </q-badge>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Columna lateral primero en móvil si es soporte/admin -->
      <div class="col-12 col-md-4 order-last order-md-first"
        v-if="authStore.profile?.rol === 'soporte' || authStore.profile?.rol === 'admin'">
        <q-card bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Gestionar Ticket</div>
            <div class="row q-gutter-xs">
              <q-btn v-for="accion in accionesEstado" :key="accion.value"
                :label="accion.label" :color="accion.color" :icon="accion.icon"
                :disable="ticket.estado === accion.value"
                unelevated class="col"
                :loading="cambiandoEstado" @click="cambiarEstado(accion.value)"
                size="sm" />
            </div>
          </q-card-section>
        </q-card>

        <q-card bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-sm">Detalles</div>
            <q-list dense>
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-6">Folio</q-item-label>
                  <q-item-label class="text-primary text-weight-bold">{{ ticket.folio }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-6">Sucursal</q-item-label>
                  <q-item-label>{{ ticket.sucursales?.nombre }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-6">Reportado por</q-item-label>
                  <q-item-label>{{ ticket.profiles?.nombre }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="ticket.resuelto_por">
                <q-item-section>
                  <q-item-label caption class="text-positive">Resuelto por</q-item-label>
                  <q-item-label class="text-positive text-weight-bold">{{ ticket.resuelto_por?.nombre }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-6">Creado</q-item-label>
                  <q-item-label>{{ formatDate(ticket.created_at) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-6">Actualizado</q-item-label>
                  <q-item-label>{{ formatDate(ticket.updated_at) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
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
              <div class="text-caption text-grey-6">Observaciones adicionales</div>
              <div class="text-body1 q-mt-xs" style="white-space: pre-wrap">{{ ticket.descripcion }}</div>
            </template>
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
            <q-input v-model="nuevoComentario" outlined label="Escribir comentario..." type="textarea" rows="2">
              <template #append>
                <q-btn flat round icon="send" color="primary"
                  :disable="!nuevoComentario.trim()" :loading="enviando" @click="enviarComentario" />
              </template>
            </q-input>
          </q-card-section>
        </q-card>
      </div>

    </div>
  </q-page>

  <q-page v-else class="flex flex-center">
    <q-spinner color="primary" size="60px" />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import api from '../lib/api'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const route = useRoute()
const authStore = useAuthStore()
const ticketsStore = useTicketsStore()
const $q = useQuasar()

const ticket = ref(null)
const comentarios = ref([])
const historial = ref([])
const nuevoComentario = ref('')
const enviando = ref(false)
const cambiandoEstado = ref(false)

const accionesEstado = [
  { label: 'Marcar En Proceso', value: 'en_proceso', color: 'info',    icon: 'sync' },
  { label: 'Marcar Resuelto',   value: 'resuelto',   color: 'positive',icon: 'check_circle' },
  { label: 'Cerrar Ticket',     value: 'cerrado',     color: 'grey-7',  icon: 'lock' },
  { label: 'Reabrir Ticket',    value: 'abierto',     color: 'warning', icon: 'lock_open' }
]

onMounted(loadAll)

async function loadAll() {
  const id = route.params.id

  const [ticketRes, comsRes, histRes] = await Promise.all([
    api.get(`/tickets/${id}`),
    api.get(`/tickets/${id}/comentarios`),
    api.get(`/tickets/${id}/historial`)
  ])

  ticket.value      = ticketRes.data
  comentarios.value = comsRes.data  || []
  historial.value   = histRes.data  || []
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

async function cambiarEstado(nuevoEstado) {
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

function getEstadoColor(e)   { return { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }[e] || 'grey' }
function getEstadoLabel(e)   { return { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }[e] || e }
function getCategoryIcon(cat){ return { cancelacion_documento: 'cancel', falla_pvwin: 'computer', falla_computadora: 'desktop_windows', otro: 'help_outline' }[cat] || 'help_outline' }
function getCategoryLabel(cat){ return { cancelacion_documento: 'Cancelación de Documento', falla_pvwin: 'Falla en PVWIN', falla_computadora: 'Falla en Equipo', otro: 'Otro' }[cat] || cat }
function getTipoDocLabel(tipo){ return { factura: 'Factura', remision: 'Remisión', traspaso: 'Traspaso', compra: 'Compra', nota_credito: 'Nota de Crédito', devolucion: 'Devolución', otro: 'Otro' }[tipo] || tipo }
function getRolColor(rol)    { return { admin: 'negative', encargada: 'primary', soporte: 'positive' }[rol] || 'grey' }
function getRolLabel(rol)    { return { admin: 'Admin', encargada: 'Encargada', soporte: 'Soporte' }[rol] || rol }
function formatDate(dateStr) { if (!dateStr) return '—'; return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es }) }
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
</style>
