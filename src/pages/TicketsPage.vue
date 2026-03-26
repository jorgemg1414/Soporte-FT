<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <div>
        <div class="text-h5 text-white text-weight-bold">Mis Reportes</div>
        <div class="text-blue-2 text-caption q-mt-xs">Consulta y da seguimiento a tus reportes</div>
      </div>
      <q-space />
      <q-btn
        v-if="authStore.profile?.rol !== 'soporte'"
        color="white" text-color="primary" icon="add" label="Nuevo Reporte"
        unelevated to="/tickets/nuevo" style="border-radius: 10px"
      />
    </div>

    <!-- Filtros -->
    <q-card bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-input v-model="filtros.busqueda" outlined dense label="Buscar por folio o título" clearable>
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-4">
            <q-select v-model="filtros.estado" outlined dense label="Estado"
              :options="estadoOptions" emit-value map-options clearable />
          </div>
          <div class="col-6 col-sm-4">
            <q-select v-model="filtros.categoria" outlined dense label="Categoría"
              :options="categoriaOptions" emit-value map-options clearable />
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
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const authStore = useAuthStore()
const ticketsStore = useTicketsStore()

const filtros = ref({ busqueda: '', estado: null, categoria: null })

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
const columns = [
  { name: 'folio',      label: 'Folio',    field: 'folio',                           align: 'left',   sortable: true },
  { name: 'titulo',     label: 'Título',   field: 'titulo',                          align: 'left',   sortable: true },
  { name: 'categoria',  label: 'Categoría',field: 'categoria',                       align: 'left' },
  { name: 'sucursal',   label: 'Sucursal', field: row => row.sucursales?.nombre,     align: 'left',   sortable: true },
  { name: 'estado',     label: 'Estado',   field: 'estado',                          align: 'center', sortable: true },
  { name: 'created_at', label: 'Fecha',    field: 'created_at',                      align: 'left',   sortable: true }
]

const ticketsFiltrados = computed(() =>
  ticketsStore.tickets.filter(t => {
    const b = filtros.value.busqueda?.toLowerCase() || ''
    return (
      (!b || t.folio.toLowerCase().includes(b) || t.titulo.toLowerCase().includes(b)) &&
      (!filtros.value.estado    || t.estado    === filtros.value.estado) &&
      (!filtros.value.categoria || t.categoria === filtros.value.categoria)
    )
  })
)

onMounted(() => ticketsStore.fetchTickets())

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
</style>
