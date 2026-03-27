<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <div>
        <div class="text-h5 text-white text-weight-bold">Mis Reportes</div>
        <div class="text-blue-2 text-caption q-mt-xs">Consulta y da seguimiento a tus reportes</div>
      </div>
      <q-space />
      <div class="row items-center q-gutter-sm">
        <div class="row items-center q-gutter-xs">
          <span class="live-dot" />
          <span class="text-white text-caption">{{ secondsAgo < 5 ? 'Actualizado' : `hace ${secondsAgo}s` }}</span>
        </div>
        <q-btn
          v-if="authStore.profile?.rol === 'admin' || authStore.profile?.rol === 'soporte'"
          unelevated icon="table_view" label="Excel"
          size="sm" @click="exportarExcel"
          style="background: #1D6F42; color: white; border-radius: 8px"
        />
        <q-btn
          v-if="authStore.profile?.rol === 'admin' || authStore.profile?.rol === 'soporte'"
          unelevated icon="picture_as_pdf" label="PDF"
          size="sm" @click="exportarPDF"
          style="background: #D32F2F; color: white; border-radius: 8px"
        />
        <q-btn
          v-if="authStore.profile?.rol !== 'soporte'"
          color="white" text-color="primary" icon="add" label="Nuevo Reporte"
          unelevated to="/tickets/nuevo" style="border-radius: 10px"
        />
      </div>
    </div>

    <!-- Filtros -->
    <q-card bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-sm">
          <!-- Búsqueda general -->
          <div class="col-12 col-sm-4">
            <q-input v-model="filtros.busqueda" outlined dense label="Buscar folio, título, sucursal…" clearable>
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <!-- Estado -->
          <div class="col-6 col-sm-2">
            <q-select v-model="filtros.estado" outlined dense label="Estado"
              :options="estadoOptions" emit-value map-options clearable />
          </div>
          <!-- Categoría -->
          <div class="col-6 col-sm-3">
            <q-select v-model="filtros.categoria" outlined dense label="Categoría"
              :options="categoriaOptions" emit-value map-options clearable />
          </div>
          <!-- Sucursal (solo admin/soporte) -->
          <div v-if="authStore.profile?.rol !== 'encargada'" class="col-12 col-sm-3">
            <q-select v-model="filtros.sucursal" outlined dense label="Sucursal"
              :options="sucursalOptions" emit-value map-options clearable />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla -->
    <q-card bordered>
      <q-table
        :rows="ticketsFiltrados"
        :columns="columns"
        row-key="id"
        flat
        :loading="ticketsStore.loading"
        :rows-per-page-options="[10, 25, 50]"
        rows-per-page-label="Filas por página"
        no-data-label="No hay tickets que mostrar"
        @row-click="(_, row) => $router.push(`/tickets/${row.id}`)"
        class="clickable-rows"
      >
        <template #body-cell-folio="props">
          <q-td :props="props">
            <span class="text-primary text-weight-bold">{{ props.value }}</span>
          </q-td>
        </template>
        <template #body-cell-estado="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="getEstadoColor(props.value)" style="font-size: 11px; padding: 4px 8px">
              {{ getEstadoLabel(props.value) }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-categoria="props">
          <q-td :props="props">
            <div class="row items-center no-wrap q-gutter-xs">
              <q-icon :name="getCategoryIcon(props.value)" color="primary" size="18px" />
              <span>{{ getCategoryLabel(props.value) }}</span>
            </div>
          </q-td>
        </template>
        <template #body-cell-tiempo="props">
          <q-td :props="props">
            <span v-if="props.row.estado === 'resuelto'" class="text-positive text-caption">
              {{ calcTiempoResolucion(props.row) }}
            </span>
            <span v-else :class="esUrgente(props.row) ? 'text-negative text-weight-bold text-caption' : 'text-grey-6 text-caption'">
              <q-icon v-if="esUrgente(props.row)" name="warning" size="12px" class="q-mr-xs" />
              {{ tiempoTranscurrido(props.row) }}
            </span>
          </q-td>
        </template>
        <template #body-cell-created_at="props">
          <q-td :props="props">{{ formatDate(props.value) }}</q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import api from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { usePolling } from '../composables/usePolling'

const authStore = useAuthStore()
const ticketsStore = useTicketsStore()

const filtros = ref({ busqueda: '', estado: null, categoria: null, sucursal: null })
const sucursales = ref([])

const estadoOptions = [
  { label: 'Abierto',    value: 'abierto' },
  { label: 'En Proceso', value: 'en_proceso' },
  { label: 'Resuelto',   value: 'resuelto' },
  { label: 'Cerrado',    value: 'cerrado' }
]
const categoriaOptions = [
  { label: 'Cancelación de Documento', value: 'cancelacion_documento' },
  { label: 'Falla PVWIN',              value: 'falla_pvwin' },
  { label: 'Falla de Equipo',          value: 'falla_computadora' },
  { label: 'Otro',                     value: 'otro' }
]
const sucursalOptions = computed(() =>
  sucursales.value.map(s => ({ label: s.nombre, value: s.nombre }))
)

const columns = [
  { name: 'folio',      label: 'Folio',      field: 'folio',                       align: 'left',   sortable: true },
  { name: 'titulo',     label: 'Título',     field: 'titulo',                      align: 'left',   sortable: true },
  { name: 'categoria',  label: 'Categoría',  field: 'categoria',                   align: 'left' },
  { name: 'sucursal',   label: 'Sucursal',   field: row => row.sucursales?.nombre, align: 'left',   sortable: true },
  { name: 'estado',     label: 'Estado',     field: 'estado',                      align: 'center', sortable: true },
  { name: 'tiempo',     label: 'Tiempo',     field: 'created_at',                  align: 'left' },
  { name: 'created_at', label: 'Fecha',      field: 'created_at',                  align: 'left',   sortable: true }
]

const ticketsFiltrados = computed(() => {
  const b = filtros.value.busqueda?.toLowerCase().trim() || ''
  return ticketsStore.tickets.filter(t => {
    const matchBusqueda = !b ||
      t.folio.toLowerCase().includes(b) ||
      t.titulo.toLowerCase().includes(b) ||
      (t.sucursales?.nombre || '').toLowerCase().includes(b) ||
      getCategoryLabel(t.categoria).toLowerCase().includes(b)
    const matchEstado    = !filtros.value.estado    || t.estado    === filtros.value.estado
    const matchCategoria = !filtros.value.categoria || t.categoria === filtros.value.categoria
    const matchSucursal  = !filtros.value.sucursal  || t.sucursales?.nombre === filtros.value.sucursal
    return matchBusqueda && matchEstado && matchCategoria && matchSucursal
  })
})

onMounted(async () => {
  await ticketsStore.fetchTickets()
  if (authStore.profile?.rol !== 'encargada') {
    const { data } = await api.get('/sucursales')
    sucursales.value = data || []
  }
})

const { secondsAgo } = usePolling(() => ticketsStore.fetchTickets(), 30000)

function exportarExcel() {
  const filas = ticketsFiltrados.value.map(t => ({
    'Folio':          t.folio,
    'Título':         t.titulo,
    'Categoría':      getCategoryLabel(t.categoria),
    'Sucursal':       t.sucursales?.nombre || '—',
    'Estado':         getEstadoLabel(t.estado),
    'Urgente':        t.urgente ? 'Sí' : 'No',
    'Reportado por':  t.profiles?.nombre || '—',
    'Resuelto por':   t.resuelto_por?.nombre || '—',
    'Tiempo resolución': calcTiempoResolucion(t),
    'Fecha creación': format(new Date(t.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
    'Última actualización': format(new Date(t.updated_at || t.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
    'Descripción':    t.descripcion || '—',
    'Folio PVWIN':    t.folio_pvwin || '—',
    'Tipo documento': t.tipo_documento || '—',
  }))

  const ws = XLSX.utils.json_to_sheet(filas)

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
    { wch: 9 },  { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 40 }, { wch: 15 }, { wch: 15 }
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reportes')

  const fecha = format(new Date(), 'yyyy-MM-dd')
  XLSX.writeFile(wb, `Reportes_${fecha}.xlsx`)
}

async function exportarPDF() {
  try {
    const { data } = await api.get('/exportar/pdf', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `Reportes_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    // fallback silencioso
  }
}

function esUrgente(t) {
  return t.urgente === true
}

function tiempoTranscurrido(t) {
  const horas = Math.floor((Date.now() - new Date(t.created_at)) / 3600000)
  if (horas < 1) return '<1h'
  if (horas < 24) return `${horas}h`
  return `${Math.floor(horas / 24)}d`
}

function calcTiempoResolucion(t) {
  if (!t.resuelto_at) return '—'
  const horas = Math.round((new Date(t.resuelto_at) - new Date(t.created_at)) / 3600000)
  if (horas < 24) return `${horas}h`
  return `${Math.floor(horas / 24)}d`
}

function getEstadoColor(e) {
  return { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }[e] || 'grey'
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
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es })
}
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
.clickable-rows :deep(tbody tr) { cursor: pointer; transition: background 0.15s; }
.clickable-rows :deep(tbody tr:hover) { background: rgba(25, 118, 210, 0.06) !important; }
.live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #69F0AE; display: inline-block;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
}
</style>
