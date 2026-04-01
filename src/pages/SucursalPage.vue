<template>
  <q-page class="sucursal-page">

    <!-- Header de sucursal -->
    <div class="sucursal-header q-pa-md row items-center">
      <div class="col">
        <div class="text-h6 text-white text-weight-bold">
          <q-icon name="store" class="q-mr-xs" />{{ authStore.profile?.sucursales?.nombre }}
        </div>
        <div class="text-blue-2 text-caption">Sistema de Reportes · {{ fechaHoy }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <q-tabs
      v-model="tab"
      class="tab-bar text-white"
      active-color="white"
      indicator-color="white"
      align="justify"
      dense
    >
      <q-tab name="nuevo" icon="add_circle" label="Nuevo Reporte" />
      <q-tab name="mis" icon="list_alt" :label="`Mis Reportes${ticketsStore.tickets.length ? ' (' + ticketsStore.tickets.length + ')' : ''}`" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>

      <!-- ─── TAB: NUEVO REPORTE ─── -->
      <q-tab-panel name="nuevo" class="q-pa-md flex flex-center">
        <div style="width: 100%; max-width: 520px">
          <TicketForm :show-success-card="true" />
        </div>
      </q-tab-panel>

      <!-- ─── TAB: MIS REPORTES ─── -->
      <q-tab-panel name="mis" class="q-pa-sm">

        <!-- Mini-stats -->
        <div v-if="!ticketsStore.loading && ticketsStore.tickets.length > 0" class="row q-gutter-sm q-mb-sm q-px-xs">
          <div v-for="stat in miniStats" :key="stat.label"
            class="col mini-stat-card q-pa-sm text-center"
            :style="`border-left: 3px solid ${stat.color}`">
            <div class="text-h6 text-weight-bold" :style="`color: ${stat.color}`">{{ stat.count }}</div>
            <div class="text-caption text-grey-6">{{ stat.label }}</div>
          </div>
        </div>

        <div v-if="ticketsStore.loading" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="50px" />
        </div>

        <div v-else-if="ticketsStore.tickets.length === 0" class="text-center text-grey-5 q-pa-xl">
          <q-icon name="inbox" size="60px" class="q-mb-md" />
          <div class="text-h6">Sin reportes aún</div>
          <div class="text-caption">Crea tu primer reporte en la pestaña anterior</div>
        </div>

        <div v-else class="q-gutter-sm">
          <!-- Indicador en vivo -->
          <div class="row items-center q-gutter-xs q-mb-xs q-px-xs">
            <span class="live-dot" />
            <span class="text-caption text-grey-6">
              {{ secondsAgo < 5 ? 'Actualizado' : `Actualizado hace ${secondsAgo}s` }}
            </span>
          </div>

          <!-- Filtros rápidos -->
          <div class="row q-gutter-xs q-mb-sm">
            <q-chip v-for="f in filtrosRapidos" :key="f.value"
              :selected="filtroActivo === f.value"
              @click="filtroActivo = filtroActivo === f.value ? null : f.value"
              :color="f.value ? f.color : 'grey-3'"
              :text-color="filtroActivo === f.value ? 'white' : 'dark'"
              clickable dense>
              {{ f.label }} ({{ contarEstado(f.value) }})
            </q-chip>
          </div>

          <q-card v-for="ticket in ticketsFiltrados" :key="ticket.id"
            bordered clickable @click="$router.push(`/tickets/${ticket.id}`)"
            class="ticket-card q-mb-sm">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="text-primary text-weight-bold text-body2">{{ ticket.folio }}</span>
                <q-badge :color="getEstadoColor(ticket.estado)" style="font-size: 11px; padding: 3px 8px; border-radius: 10px">
                  {{ getEstadoLabel(ticket.estado) }}
                </q-badge>
              </div>
              <div class="text-body2 text-weight-medium ellipsis">{{ ticket.titulo }}</div>
              <div class="row items-center q-mt-xs q-gutter-xs">
                <q-icon :name="getCategoryIcon(ticket.categoria)" size="14px" color="grey-6" />
                <span class="text-caption text-grey-6">{{ getCategoryLabel(ticket.categoria) }}</span>
                <q-space />
                <span class="text-caption text-grey-5">{{ formatDate(ticket.created_at, 'dd/MM/yyyy') }}</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePolling } from '../composables/usePolling'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import TicketForm from '../components/TicketForm.vue'
import { getEstadoColor, getEstadoLabel, getCategoryIcon, getCategoryLabel, formatDate } from '../composables/useTicketHelpers'

const authStore = useAuthStore()
const ticketsStore = useTicketsStore()

const tab = ref('nuevo')
const filtroActivo = ref(null)

const fechaHoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

const filtrosRapidos = [
  { label: 'Abierto',     value: 'abierto',    color: 'warning' },
  { label: 'En Proceso',  value: 'en_proceso', color: 'info' },
  { label: 'Resuelto',    value: 'resuelto',   color: 'positive' },
  { label: 'Cerrado',     value: 'cerrado',    color: 'grey-6' }
]

const ticketsFiltrados = computed(() =>
  ticketsStore.tickets.filter(t => !filtroActivo.value || t.estado === filtroActivo.value)
)

const miniStats = computed(() => [
  { label: 'Abiertos',   count: contarEstado('abierto'),    color: '#F2C037' },
  { label: 'En Proceso', count: contarEstado('en_proceso'), color: '#31CCEC' },
  { label: 'Resueltos',  count: contarEstado('resuelto'),   color: '#21BA45' },
  { label: 'Cerrados',   count: contarEstado('cerrado'),    color: '#9E9E9E' },
])

function contarEstado(estado) {
  if (!estado) return ticketsStore.tickets.length
  return ticketsStore.tickets.filter(t => t.estado === estado).length
}

const { secondsAgo } = usePolling(() => ticketsStore.fetchTickets(), 30000)

onMounted(() => {
  ticketsStore.fetchTickets()
})
</script>

<style scoped>
.sucursal-header {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
}
.tab-bar {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
}
.live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #21BA45; display: inline-block;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
}
.ticket-card {
  cursor: pointer;
  transition: box-shadow 0.15s;
  border-radius: 12px !important;
}
.ticket-card:hover { box-shadow: 0 4px 16px rgba(25, 118, 210, 0.15) !important; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-stat-card {
  background: rgba(0,0,0,0.03);
  border-radius: 8px;
  min-width: 0;
}
.body--dark .mini-stat-card {
  background: rgba(255,255,255,0.05);
}
</style>
