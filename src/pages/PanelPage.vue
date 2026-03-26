<template>
  <q-page class="q-pa-sm">

    <!-- Header -->
    <div class="panel-header q-pa-md q-mb-sm">
      <div class="text-h6 text-white text-weight-bold">
        <q-icon name="dashboard_customize" class="q-mr-xs" /> Panel de Reportes
      </div>
      <div class="text-blue-2 text-caption">{{ fechaHoy }}</div>
    </div>

    <!-- Chips de filtro con conteos -->
    <div class="row q-col-gutter-xs q-px-sm q-mb-sm">
      <div v-for="f in filtros" :key="f.value ?? 'todos'" class="col-auto">
        <q-btn
          :outline="filtroActivo !== f.value"
          unelevated
          :color="filtroActivo === f.value ? f.color : 'grey-4'"
          :text-color="filtroActivo === f.value ? 'white' : 'dark'"
          :label="`${f.label} (${contarEstado(f.value)})`"
          size="sm"
          dense
          style="border-radius: 20px; min-width: 80px"
          @click="filtroActivo = f.value"
        />
      </div>
      <q-space />
      <q-btn flat round icon="refresh" color="primary" size="sm" :loading="loading" @click="cargar" />
    </div>

    <!-- Lista de tickets -->
    <div v-if="loading && !tickets.length" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="50px" />
    </div>

    <div v-else-if="ticketsFiltrados.length === 0" class="text-center text-grey-5 q-pa-xl">
      <q-icon name="check_circle" size="60px" color="positive" class="q-mb-md" />
      <div class="text-h6">¡Todo al día!</div>
      <div class="text-caption">No hay reportes en esta categoría</div>
    </div>

    <div v-else class="q-gutter-xs">
      <q-card v-for="t in ticketsFiltrados" :key="t.id"
        bordered clickable @click="$router.push(`/tickets/${t.id}`)"
        class="ticket-card">

        <!-- Línea de color izquierda según estado -->
        <div class="estado-stripe" :style="{ background: getEstadoHex(t.estado) }" />

        <q-card-section class="q-pa-sm q-pl-md">
          <!-- Fila 1: folio + estado + sucursal -->
          <div class="row items-center no-wrap q-mb-xs">
            <span class="text-primary text-weight-bold text-caption q-mr-sm">{{ t.folio }}</span>
            <q-badge :color="getEstadoColor(t.estado)" style="font-size: 10px; padding: 2px 7px; border-radius: 8px; flex-shrink:0">
              {{ getEstadoLabel(t.estado) }}
            </q-badge>
            <q-space />
            <div class="row items-center no-wrap">
              <q-icon name="store" size="13px" color="grey-6" class="q-mr-xs" />
              <span class="text-caption text-grey-6 text-weight-medium">{{ t.sucursales?.nombre }}</span>
            </div>
          </div>

          <!-- Fila 2: título -->
          <div class="text-body2 text-weight-medium ellipsis q-mb-xs">{{ t.titulo }}</div>

          <!-- Fila 3: categoria + fecha + resuelto por -->
          <div class="row items-center no-wrap">
            <q-icon :name="getCategoryIcon(t.categoria)" size="14px" color="grey-5" class="q-mr-xs" />
            <span class="text-caption text-grey-5">{{ getCategoryLabel(t.categoria) }}</span>
            <q-space />
            <template v-if="t.resuelto_por">
              <q-icon name="person_check" size="14px" color="positive" class="q-mr-xs" />
              <span class="text-caption text-positive text-weight-medium">{{ t.resuelto_por.nombre }}</span>
            </template>
            <span v-else class="text-caption text-grey-4">{{ formatDate(t.created_at) }}</span>
          </div>
        </q-card-section>
      </q-card>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const loading = ref(false)
const tickets = ref([])
const filtroActivo = ref(null)

const fechaHoy = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })

const filtros = [
  { label: 'Todos',      value: null,         color: 'primary' },
  { label: 'Abiertos',   value: 'abierto',    color: 'warning' },
  { label: 'En Proceso', value: 'en_proceso', color: 'info' },
  { label: 'Resueltos',  value: 'resuelto',   color: 'positive' },
  { label: 'Cerrados',   value: 'cerrado',    color: 'grey-6' }
]

const ticketsFiltrados = computed(() =>
  tickets.value.filter(t => filtroActivo.value === null || t.estado === filtroActivo.value)
)

function contarEstado(estado) {
  if (estado === null) return tickets.value.length
  return tickets.value.filter(t => t.estado === estado).length
}

async function cargar() {
  loading.value = true
  try {
    const { data } = await api.get('/tickets')
    tickets.value = data || []
  } catch { /* silencioso */ }
  finally { loading.value = false }
}

onMounted(cargar)

function getEstadoColor(e) {
  return { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }[e] || 'grey'
}
function getEstadoHex(e) {
  return { abierto: '#FFA000', en_proceso: '#1976D2', resuelto: '#388E3C', cerrado: '#9E9E9E' }[e] || '#ccc'
}
function getEstadoLabel(e) {
  return { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }[e] || e
}
function getCategoryIcon(cat) {
  return { cancelacion_documento: 'cancel', falla_pvwin: 'computer', falla_computadora: 'desktop_windows', otro: 'help_outline' }[cat] || 'help_outline'
}
function getCategoryLabel(cat) {
  return { cancelacion_documento: 'Cancelación', falla_pvwin: 'Falla PVWIN', falla_computadora: 'Falla Equipo', otro: 'Otro' }[cat] || cat
}
function formatDate(dateStr) {
  return format(new Date(dateStr), 'dd/MM/yy', { locale: es })
}
</script>

<style scoped>
.panel-header {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 0 0 16px 16px;
}
.ticket-card {
  cursor: pointer;
  border-radius: 10px !important;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.ticket-card:hover { box-shadow: 0 4px 16px rgba(25, 118, 210, 0.15) !important; }
.estado-stripe {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
