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

    <!-- Estadísticas -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-6 col-sm-3" v-for="col in columnas" :key="col.estado">
        <q-card bordered class="stat-card" :style="`border-top: 3px solid var(--col-${col.estado})`">
          <q-card-section class="q-pa-sm">
            <div class="row items-center no-wrap">
              <div class="stat-icon-wrap q-mr-sm" :style="`background: var(--col-${col.estado}-bg)`">
                <q-icon :name="col.icon" :color="col.color" size="20px" />
              </div>
              <div>
                <div class="text-h5 text-weight-bold">{{ colTickets(col.estado).length }}</div>
                <div class="text-caption text-grey-6">{{ col.label }}</div>
              </div>
            </div>
            <!-- Barra de progreso -->
            <q-linear-progress
              class="q-mt-sm"
              :value="ticketsFiltrados.length ? colTickets(col.estado).length / ticketsFiltrados.length : 0"
              :color="col.color"
              rounded size="6px"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Card urgentes -->
      <div class="col-6 col-sm-3">
        <q-card bordered class="stat-card" style="border-top: 3px solid #C10015">
          <q-card-section class="q-pa-sm">
            <div class="row items-center no-wrap">
              <div class="stat-icon-wrap q-mr-sm" style="background: rgba(193,0,21,0.10)">
                <q-icon name="warning" color="negative" size="20px" />
              </div>
              <div>
                <div class="text-h5 text-weight-bold">{{ urgentesCount }}</div>
                <div class="text-caption text-grey-6">Urgentes</div>
              </div>
            </div>
            <q-linear-progress
              class="q-mt-sm"
              :value="ticketsFiltrados.length ? urgentesCount / ticketsFiltrados.length : 0"
              color="negative"
              rounded size="6px"
            />
          </q-card-section>
        </q-card>
      </div>
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
  { estado: 'abierto',    label: 'Abierto',    color: 'warning',  icon: 'radio_button_unchecked' },
  { estado: 'en_proceso', label: 'En Proceso', color: 'info',     icon: 'sync' },
  { estado: 'resuelto',   label: 'Resuelto',   color: 'positive', icon: 'check_circle' },
  { estado: 'cerrado',    label: 'Cerrado',    color: 'grey-6',   icon: 'lock' }
]

const urgentesCount = computed(() => ticketsFiltrados.value.filter(t => t.urgente).length)

const categoriaOptions = [
  { label: 'Cancel. PVWIN',  value: 'cancelacion_documento' },
  { label: 'Cancel. Portal', value: 'cancelacion_portal' },
  { label: 'Falla PVWIN',    value: 'falla_pvwin' },
  { label: 'Falla Equipo',   value: 'falla_computadora' },
  { label: 'Otro',           value: 'otro' }
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
  const [sucRes, tecRes] = await Promise.all([api.get('/sucursales'), api.get('/usuarios/tecnicos')])
  sucursales.value = sucRes.data || []
  tecnicos.value = tecRes.data || []
})

const { secondsAgo } = usePolling(cargar, 30000)

const transiciones = {
  abierto:    ['en_proceso', 'resuelto', 'cerrado'],
  en_proceso: ['resuelto', 'cerrado', 'abierto'],
  resuelto:   ['cerrado', 'abierto'],
  cerrado:    ['abierto']
}

async function onDrop(event, nuevoEstado) {
  const item = event.added?.element
  if (!item || item.estado === nuevoEstado) return

  const validas = transiciones[item.estado] || []
  if (!validas.includes(nuevoEstado)) {
    $q.notify({
      type: 'negative',
      message: `No se puede mover de "${item.estado}" a "${nuevoEstado}"`
    })
    return
  }

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
:root {
  --col-abierto: #F2C037;    --col-abierto-bg: rgba(242,192,55,0.12);
  --col-en_proceso: #31CCEC; --col-en_proceso-bg: rgba(49,204,236,0.12);
  --col-resuelto: #21BA45;   --col-resuelto-bg: rgba(33,186,69,0.12);
  --col-cerrado: #9E9E9E;    --col-cerrado-bg: rgba(158,158,158,0.12);
}
.stat-card {
  border-radius: 10px !important;
  transition: transform 0.15s, box-shadow 0.15s;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.10) !important;
}
.stat-icon-wrap {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
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
