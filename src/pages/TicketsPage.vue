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
          <!-- Botón "Mis tickets" solo para admin/soporte -->
          <q-btn v-if="authStore.profile?.rol !== 'encargada'"
            flat dense size="sm" icon="person" class="q-mr-xs"
            :color="filtros.tecnico === authStore.profile?.id ? 'primary' : 'grey-6'"
            :label="filtros.tecnico === authStore.profile?.id ? 'Mis tickets ✓' : 'Mis tickets'"
            @click="toggleMisTickets">
            <q-tooltip>{{ filtros.tecnico === authStore.profile?.id ? 'Quitar filtro' : 'Ver solo mis tickets asignados' }}</q-tooltip>
          </q-btn>
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

      <!-- Skeleton: primera carga (sin datos aún) -->
      <template v-if="ticketsStore.loading && ticketsStore.tickets.length === 0">
        <div class="q-pa-sm">
          <div v-for="i in 9" :key="i"
            class="row items-center no-wrap q-px-md q-py-sm q-gutter-md"
            :style="i < 9 ? 'border-bottom: 1px solid rgba(128,128,128,0.15)' : ''">
            <q-skeleton type="text" width="75px" />
            <q-skeleton type="text" class="col" />
            <q-skeleton type="text" width="100px" />
            <q-skeleton type="text" width="80px" />
            <q-skeleton type="QBadge" width="72px" height="24px" />
            <q-skeleton type="QBadge" width="52px" height="24px" />
            <q-skeleton type="text" width="88px" />
          </div>
        </div>
      </template>

      <q-table v-else
        :rows="ticketsFiltrados"
        :columns="columns"
        row-key="id"
        flat
        :loading="ticketsStore.loading && ticketsStore.tickets.length > 0"
        :rows-per-page-options="[10, 25, 50]"
        rows-per-page-label="Filas por página"
        :row-class="rowClass"
        @row-click="(_, row) => $router.push(`/tickets/${row.id}`)"
        class="clickable-rows"
      >
        <template #no-data>
          <div class="full-width column items-center justify-center text-grey-5 q-py-xl">
            <q-icon name="confirmation_number" size="72px" class="q-mb-md" style="opacity:0.35" />
            <div class="text-h6 text-weight-light q-mb-xs">Sin tickets</div>
            <div class="text-caption text-center" style="max-width:280px">
              No hay tickets que coincidan con los filtros actuales
            </div>
          </div>
        </template>
        <template #body-cell-folio="props">
          <q-td :props="props">
            <div class="row items-center no-wrap q-gutter-xs">
              <span class="text-primary text-weight-bold">{{ props.value }}</span>
              <q-badge v-if="esMio(props.row)"
                color="teal" style="font-size: 10px; padding: 2px 6px">
                Mío
              </q-badge>
            </div>
          </q-td>
        </template>
        <template #body-cell-estado="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="getEstadoColor(props.value)"
              :class="{ 'badge-pulse': props.value === 'abierto' || props.value === 'en_proceso' }"
              style="font-size: 11px; padding: 4px 8px">
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
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import { useQuasar } from 'quasar'
import api from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { usePolling } from '../composables/usePolling'
import { useSLA } from '../composables/useSLA'
import { getEstadoColor, getEstadoLabel, getCategoryIcon, getCategoryLabel, formatDate } from '../composables/useTicketHelpers'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const ticketsStore = useTicketsStore()
const $q = useQuasar()
const { slaLabel, slaBadgeColor, slaIcon } = useSLA()

const FILTROS_KEY = 'tickets_filtros'
const filtrosDefault = { busqueda: '', estado: null, categoria: null, sucursal: null, tecnico: null, urgente: false, fechaDesde: null, fechaHasta: null }

// Inicializar desde URL (prioridad) → localStorage → default
let storedFiltros = {}
try { storedFiltros = JSON.parse(localStorage.getItem(FILTROS_KEY) || '{}') } catch { /* ignorar JSON inválido */ }

const queryFiltros = {}
if (route.query.estado)     queryFiltros.estado     = route.query.estado
if (route.query.categoria)  queryFiltros.categoria  = route.query.categoria
if (route.query.sucursal)   queryFiltros.sucursal   = route.query.sucursal
if (route.query.tecnico)    queryFiltros.tecnico    = route.query.tecnico
if (route.query.urgente)    queryFiltros.urgente    = route.query.urgente === '1'
if (route.query.fechaDesde) queryFiltros.fechaDesde = route.query.fechaDesde
if (route.query.fechaHasta) queryFiltros.fechaHasta = route.query.fechaHasta

const filtros = ref({ ...filtrosDefault, ...storedFiltros, ...queryFiltros })
const sucursales = ref([])
const tecnicos = ref([])
const buscando = ref(false)
const searchResults = ref([])
let searchTimeout = null

// Sincronizar con localStorage y URL al cambiar filtros
watch(filtros, v => {
  localStorage.setItem(FILTROS_KEY, JSON.stringify(v))
  const query = {}
  if (v.estado)     query.estado     = v.estado
  if (v.categoria)  query.categoria  = v.categoria
  if (v.sucursal)   query.sucursal   = v.sucursal
  if (v.tecnico)    query.tecnico    = v.tecnico
  if (v.urgente)    query.urgente    = '1'
  if (v.fechaDesde) query.fechaDesde = v.fechaDesde
  if (v.fechaHasta) query.fechaHasta = v.fechaHasta
  router.replace({ query })
}, { deep: true })

const estadoOptions = [
  { label: 'Abierto',    value: 'abierto' },
  { label: 'En Proceso', value: 'en_proceso' },
  { label: 'Resuelto',   value: 'resuelto' },
  { label: 'Cerrado',    value: 'cerrado' }
]
const categoriaOptions = [
  { label: 'Cancelación Doc. PVWIN',  value: 'cancelacion_documento' },
  { label: 'Cancelación Doc. Portal', value: 'cancelacion_portal' },
  { label: 'Falla PVWIN',             value: 'falla_pvwin' },
  { label: 'Falla de Equipo',         value: 'falla_computadora' },
  { label: 'Otro',                    value: 'otro' }
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

function toggleMisTickets() {
  filtros.value.tecnico = filtros.value.tecnico === authStore.profile?.id
    ? null
    : authStore.profile?.id
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
    const matchTecnico   = !filtros.value.tecnico   || (t.asignados_ids?.includes(filtros.value.tecnico) || t.asignado_a === filtros.value.tecnico)
    const matchUrgente   = !filtros.value.urgente   || !!t.urgente
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
      api.get('/usuarios/tecnicos')
    ])
    sucursales.value = sucRes.data || []
    tecnicos.value = tecRes.data || []
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
    const params = new URLSearchParams()
    if (filtros.value.estado) params.set('estado', filtros.value.estado)
    if (filtros.value.categoria) params.set('categoria', filtros.value.categoria)
    if (filtros.value.sucursal) params.set('sucursal', filtros.value.sucursal)
    if (filtros.value.urgente) params.set('urgente', '1')
    const query = params.toString() ? `?${params.toString()}` : ''
    const { data } = await api.get(`/exportar/pdf${query}`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `Reportes_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    $q.notify({ type: 'negative', message: 'Error al generar el PDF' })
  }
}

function esMio(row) {
  const me = authStore.profile?.id
  if (!me) return false
  return row.asignados_ids?.includes(me) || row.asignado_a === me
}

function rowClass(row) {
  return esMio(row) ? 'row-assigned-me' : ''
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
.clickable-rows :deep(tr.row-assigned-me) { border-left: 3px solid #00897B; }
.clickable-rows :deep(tr.row-assigned-me td:first-child) { padding-left: 9px; }
</style>
