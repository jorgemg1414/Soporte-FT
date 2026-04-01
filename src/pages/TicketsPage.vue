<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-px-md q-py-sm q-mb-md">
      <div class="text-subtitle1 text-white text-weight-bold">
        <q-icon name="confirmation_number" class="q-mr-xs" />Reportes
      </div>
      <q-space />
      <div class="row items-center q-gutter-xs">
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
          size="sm"
        />
      </div>
    </div>

    <!-- Filtros -->
    <q-card bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <span class="text-caption text-grey-6 text-weight-medium">FILTROS</span>
          <q-badge v-if="filtrosActivos > 0" color="primary" class="q-ml-sm">{{ filtrosActivos }}</q-badge>
          <q-space />
          <q-btn v-if="filtrosActivos > 0" flat dense size="sm" icon="clear_all" label="Limpiar" color="grey-6" @click="limpiarFiltros" />
        </div>
        <div class="row q-col-gutter-sm">
          <!-- Búsqueda general -->
          <div class="col-12 col-sm-4">
            <q-input v-model="filtros.busqueda" outlined dense label="Buscar folio, título, sucursal…" clearable
              :loading="buscando" @update:model-value="onSearchInput">
              <template #prepend><q-icon name="search" /></template>
              <template v-if="searchResults.length > 0" #append>
                <q-badge color="primary" :label="`${searchResults.length} resultado(s)`" />
              </template>
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
          <!-- Técnico (solo admin/soporte) -->
          <div v-if="authStore.profile?.rol !== 'encargada'" class="col-12 col-sm-3">
            <q-select v-model="filtros.tecnico" outlined dense label="Técnico asignado"
              :options="tecnicosOptions" emit-value map-options clearable />
          </div>
          <!-- Fecha desde -->
          <div class="col-6 col-sm-2">
            <q-input v-model="filtros.fechaDesde" outlined dense label="Desde" type="date" clearable />
          </div>
          <!-- Fecha hasta -->
          <div class="col-6 col-sm-2">
            <q-input v-model="filtros.fechaHasta" outlined dense label="Hasta" type="date" clearable />
          </div>
          <!-- Solo urgentes -->
          <div class="col-auto flex items-center">
            <q-toggle v-model="filtros.urgente" label="Solo urgentes" color="negative" dense />
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
            <q-badge :color="slaBadgeColor(props.row)" style="font-size: 11px; padding: 3px 8px">
              <q-icon :name="slaIcon(props.row)" size="12px" class="q-mr-xs" />
              {{ slaLabel(props.row) }}
            </q-badge>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import api from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { usePolling } from '../composables/usePolling'
import { useSLA } from '../composables/useSLA'
import { getEstadoColor, getEstadoLabel, getCategoryIcon, getCategoryLabel, formatDate } from '../composables/useTicketHelpers'

const authStore = useAuthStore()
const ticketsStore = useTicketsStore()
const { slaLabel, slaBadgeColor, slaIcon } = useSLA()

const FILTROS_KEY = 'tickets_filtros'
const filtrosDefault = { busqueda: '', estado: null, categoria: null, sucursal: null, tecnico: null, urgente: false, fechaDesde: null, fechaHasta: null }

const stored = localStorage.getItem(FILTROS_KEY)
const filtros = ref(stored ? { ...filtrosDefault, ...JSON.parse(stored) } : { ...filtrosDefault })
const sucursales = ref([])
const tecnicos = ref([])
const buscando = ref(false)
const searchResults = ref([])
let searchTimeout = null

watch(filtros, v => localStorage.setItem(FILTROS_KEY, JSON.stringify(v)), { deep: true })

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
const tecnicosOptions = computed(() =>
  tecnicos.value.map(t => ({ label: t.nombre, value: t.id }))
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

const filtrosActivos = computed(() => {
  const f = filtros.value
  return [f.busqueda, f.estado, f.categoria, f.sucursal, f.tecnico, f.urgente || null, f.fechaDesde, f.fechaHasta].filter(Boolean).length
})

function limpiarFiltros() {
  filtros.value = { ...filtrosDefault }
}

const ticketsFiltrados = computed(() => {
  // Si hay resultados de búsqueda FTS, usarlos como base
  let base = searchResults.value.length > 0 ? searchResults.value : ticketsStore.tickets

  return base.filter(t => {
    const b = filtros.value.busqueda?.toLowerCase().trim() || ''
    // Si hay resultados FTS, solo aplicar filtros adicionales (no el texto)
    const matchBusqueda = searchResults.value.length > 0 || !b ||
      t.folio.toLowerCase().includes(b) ||
      t.titulo.toLowerCase().includes(b) ||
      (t.sucursales?.nombre || '').toLowerCase().includes(b) ||
      getCategoryLabel(t.categoria).toLowerCase().includes(b)
    const matchEstado    = !filtros.value.estado    || t.estado    === filtros.value.estado
    const matchCategoria = !filtros.value.categoria || t.categoria === filtros.value.categoria
    const matchSucursal  = !filtros.value.sucursal  || t.sucursales?.nombre === filtros.value.sucursal
    const matchTecnico   = !filtros.value.tecnico   || t.asignado_a === filtros.value.tecnico
    const matchUrgente   = !filtros.value.urgente   || t.urgente === true
    const matchDesde     = !filtros.value.fechaDesde || t.created_at >= filtros.value.fechaDesde
    const matchHasta     = !filtros.value.fechaHasta || t.created_at.slice(0, 10) <= filtros.value.fechaHasta
    return matchBusqueda && matchEstado && matchCategoria && matchSucursal && matchTecnico && matchUrgente && matchDesde && matchHasta
  })
})

onMounted(async () => {
  await ticketsStore.fetchTickets()
  if (authStore.profile?.rol !== 'encargada') {
    const [sucRes, tecRes] = await Promise.all([
      api.get('/sucursales'),
      api.get('/usuarios')
    ])
    sucursales.value = sucRes.data || []
    tecnicos.value = (tecRes.data || []).filter(u => u.rol === 'soporte' || u.rol === 'admin')
  }
})

const { secondsAgo } = usePolling(() => ticketsStore.fetchTickets(), 30000)

// Búsqueda full-text con debounce
function onSearchInput(val) {
  clearTimeout(searchTimeout)
  searchResults.value = []
  if (!val || val.trim().length < 3) return

  searchTimeout = setTimeout(async () => {
    buscando.value = true
    try {
      const { data } = await api.get(`/tickets/search?q=${encodeURIComponent(val.trim())}`)
      searchResults.value = data || []
    } catch { /* silencioso */ }
    finally { buscando.value = false }
  }, 400)
}

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

function calcTiempoResolucion(t) {
  if (!t.resuelto_at) return '—'
  const horas = Math.round((new Date(t.resuelto_at) - new Date(t.created_at)) / 3600000)
  if (horas < 24) return `${horas}h`
  return `${Math.floor(horas / 24)}d`
}


</script>

<style scoped>
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
