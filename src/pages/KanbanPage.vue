<template>
  <q-page class="q-pa-md">

    <!-- Header -->
    <div class="welcome-banner row items-center q-pa-lg q-mb-md">
      <div>
        <div class="text-h5 text-white text-weight-bold">Tablero Kanban</div>
        <div class="text-blue-2 text-caption q-mt-xs">
          {{ ticketsFiltrados.length }} ticket{{ ticketsFiltrados.length !== 1 ? 's' : '' }}
          <span v-if="secondsAgo < 5"> · Actualizado</span>
          <span v-else> · hace {{ secondsAgo }}s</span>
        </div>
      </div>
      <q-space />
      <span class="live-dot q-mr-sm" />
    </div>

    <!-- Filtros -->
    <q-card bordered class="q-mb-md">
      <q-card-section class="q-pa-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-4">
            <q-input v-model="busqueda" outlined dense label="Buscar…" clearable>
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-3">
            <q-select v-model="filtroCat" outlined dense label="Categoría"
              :options="categoriaOptions" emit-value map-options clearable />
          </div>
          <div class="col-6 col-sm-3">
            <q-select v-model="filtroSuc" outlined dense label="Sucursal"
              :options="sucursalOptions" emit-value map-options clearable />
          </div>
          <div class="col-auto flex items-center">
            <q-toggle v-model="soloUrgentes" label="Urgentes" color="negative" dense />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Tablero -->
    <div class="row q-col-gutter-md kanban-board">
      <div v-for="col in columnas" :key="col.estado" class="col-12 col-sm-6 col-md-3">
        <div class="kanban-col q-pa-sm rounded-borders" :class="isDark ? 'bg-dark' : 'bg-grey-1'">

          <!-- Header columna -->
          <div class="row items-center q-mb-sm q-px-xs">
            <q-badge :color="col.color" style="font-size: 12px; padding: 4px 10px; border-radius: 10px">
              {{ col.label }}
            </q-badge>
            <q-badge color="grey-6" class="q-ml-sm" style="font-size: 11px">
              {{ colTickets(col.estado).length }}
            </q-badge>
          </div>

          <!-- Cards arrastrables -->
          <draggable
            :list="colTickets(col.estado)"
            group="tickets"
            item-key="id"
            ghost-class="drag-ghost"
            chosen-class="drag-chosen"
            @change="(e) => onDrop(e, col.estado)"
          >
            <template #item="{ element }">
              <KanbanCard :ticket="element" :tecnicos="tecnicos" />
            </template>
          </draggable>

          <!-- Placeholder vacío -->
          <div v-if="colTickets(col.estado).length === 0"
            class="text-center text-grey-4 q-pa-md text-caption col-empty">
            <q-icon name="inbox" size="32px" class="q-mb-xs" />
            <div>Sin tickets</div>
          </div>
        </div>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import draggable from 'vuedraggable'
import api from '../lib/api'
import { usePolling } from '../composables/usePolling'
import KanbanCard from '../components/KanbanCard.vue'

const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)

const tickets = ref([])
const tecnicos = ref([])
const sucursales = ref([])
const busqueda = ref('')
const filtroCat = ref(null)
const filtroSuc = ref(null)
const soloUrgentes = ref(false)

const columnas = [
  { estado: 'abierto',    label: 'Abierto',     color: 'warning' },
  { estado: 'en_proceso', label: 'En Proceso',  color: 'info' },
  { estado: 'resuelto',   label: 'Resuelto',    color: 'positive' },
  { estado: 'cerrado',    label: 'Cerrado',     color: 'grey-6' }
]

const categoriaOptions = [
  { label: 'Cancelación',  value: 'cancelacion_documento' },
  { label: 'Falla PVWIN',  value: 'falla_pvwin' },
  { label: 'Falla Equipo', value: 'falla_computadora' },
  { label: 'Otro',         value: 'otro' }
]
const sucursalOptions = computed(() => sucursales.value.map(s => ({ label: s.nombre, value: s.id })))

const ticketsFiltrados = computed(() => {
  const b = busqueda.value?.toLowerCase().trim() || ''
  return tickets.value.filter(t => {
    const matchB = !b || t.folio.toLowerCase().includes(b) || t.titulo.toLowerCase().includes(b)
    const matchC = !filtroCat.value   || t.categoria    === filtroCat.value
    const matchS = !filtroSuc.value   || t.sucursal_id  === filtroSuc.value
    const matchU = !soloUrgentes.value || t.urgente === true
    return matchB && matchC && matchS && matchU
  })
})

function colTickets(estado) {
  return ticketsFiltrados.value.filter(t => t.estado === estado)
}

async function cargar() {
  try {
    const { data } = await api.get('/tickets')
    tickets.value = data || []
  } catch { /* silencioso */ }
}

onMounted(async () => {
  await cargar()
  const [sucRes, tecRes] = await Promise.all([api.get('/sucursales'), api.get('/usuarios')])
  sucursales.value = sucRes.data || []
  tecnicos.value = (tecRes.data || []).filter(u => u.rol === 'soporte' || u.rol === 'admin')
})

const { secondsAgo } = usePolling(cargar, 30000)

async function onDrop(event, nuevoEstado) {
  const item = event.added?.element
  if (!item || item.estado === nuevoEstado) return

  // Optimistic update
  const prevEstado = item.estado
  item.estado = nuevoEstado

  try {
    await api.put(`/tickets/${item.id}/estado`, { estado: nuevoEstado })
  } catch {
    item.estado = prevEstado
    $q.notify({ type: 'negative', message: 'No se pudo cambiar el estado' })
  }
}
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
.kanban-board { overflow-x: auto; }
.kanban-col {
  min-height: 200px;
  min-width: 220px;
}
.col-empty { border: 2px dashed; border-color: #ccc; border-radius: 8px; }
.drag-ghost { opacity: 0.4; background: #c3dcff !important; }
.drag-chosen { box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important; }
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
