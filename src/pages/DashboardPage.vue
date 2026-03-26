<template>
  <q-page class="q-pa-md">

    <!-- Bienvenida con gradiente -->
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <div>
        <div class="text-h5 text-white text-weight-bold">
          ¡Bienvenido, {{ authStore.profile?.nombre }}!
        </div>
        <div class="text-blue-2 q-mt-xs">
          {{ authStore.profile?.sucursales?.nombre || 'Panel general' }} — {{ fechaHoy }}
        </div>
      </div>
      <q-space />
    </div>

    <!-- Tarjetas de estadísticas -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-sm-3" v-for="card in statCards" :key="card.label">
        <q-card bordered class="stat-card" :style="`border-top: 4px solid ${card.borderColor}`">
          <q-card-section class="q-pa-md">
            <div class="row items-center">
              <div class="stat-icon-wrap q-mr-md" :style="`background: ${card.bgColor}`">
                <q-icon :name="card.icon" :color="card.color" size="28px" />
              </div>
              <div>
                <div class="text-h4 text-weight-bold">{{ card.value }}</div>
                <div class="text-caption text-grey-6">{{ card.label }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Tickets recientes -->
      <div class="col-12 col-md-8">
        <q-card bordered>
          <q-card-section class="row items-center">
            <q-icon name="history" color="primary" size="22px" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Reportes Recientes</div>
            <q-space />
            <q-btn flat dense label="Ver todos" color="primary" to="/tickets" icon-right="arrow_forward" />
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item
              v-for="ticket in recentTickets" :key="ticket.id"
              clickable v-ripple
              @click="$router.push(`/tickets/${ticket.id}`)"
            >
              <q-item-section avatar>
                <div class="cat-icon-wrap" :style="`background: ${getCategoryBg(ticket.categoria)}`">
                  <q-icon :name="getCategoryIcon(ticket.categoria)" :color="getCategoryColor(ticket.categoria)" size="20px" />
                </div>
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <span class="text-primary text-weight-bold">{{ ticket.folio }}</span>
                  <span class="text-grey-6"> — {{ ticket.titulo }}</span>
                </q-item-label>
                <q-item-label caption>{{ ticket.sucursales?.nombre }} · {{ getCategoryLabel(ticket.categoria) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="getEstadoColor(ticket.estado)" class="q-mb-xs estado-badge">
                  {{ getEstadoLabel(ticket.estado) }}
                </q-badge>
                <q-item-label caption>{{ formatDate(ticket.created_at) }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="!ticketsStore.loading && recentTickets.length === 0">
              <q-item-section class="text-center text-grey-5 q-py-xl">
                <q-icon name="inbox" size="48px" class="q-mb-sm" />
                <div>No hay reportes registrados</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Panel lateral -->
      <div class="col-12 col-md-4">
        <!-- Estados -->
        <q-card bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <q-icon name="donut_large" color="primary" size="20px" class="q-mr-sm" />
              <div class="text-h6 text-weight-bold">Por Estado</div>
            </div>
            <div v-for="item in estadoItems" :key="item.label" class="q-mb-sm">
              <div class="row items-center q-mb-xs">
                <q-icon name="fiber_manual_record" :color="item.color" size="12px" class="q-mr-xs" />
                <span class="text-caption text-grey-6 col">{{ item.label }}</span>
                <span class="text-weight-bold">{{ item.value }}</span>
              </div>
              <q-linear-progress
                :value="ticketsStore.stats.total ? item.value / ticketsStore.stats.total : 0"
                :color="item.color" rounded size="6px" class="q-mb-xs"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Categorías -->
        <q-card bordered>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <q-icon name="category" color="primary" size="20px" class="q-mr-sm" />
              <div class="text-h6 text-weight-bold">Por Categoría</div>
            </div>
            <q-list dense>
              <q-item v-for="cat in categoriaItems" :key="cat.label" class="q-px-none">
                <q-item-section avatar>
                  <div class="cat-icon-wrap-sm" :style="`background: ${cat.bg}`">
                    <q-icon :name="cat.icon" :color="cat.color" size="16px" />
                  </div>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-caption">{{ cat.label }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="cat.color" outline>{{ cat.value }}</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const authStore = useAuthStore()
const ticketsStore = useTicketsStore()

onMounted(async () => {
  await Promise.all([ticketsStore.fetchTickets(), ticketsStore.fetchStats()])
})

const fechaHoy = computed(() => format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es }))
const recentTickets = computed(() => ticketsStore.tickets.slice(0, 8))

const statCards = computed(() => [
  { label: 'Total',      value: ticketsStore.stats.total      || 0, icon: 'confirmation_number',    color: 'primary',  bgColor: 'rgba(25,118,210,0.12)',  borderColor: '#1976D2' },
  { label: 'Abiertos',   value: ticketsStore.stats.abiertos   || 0, icon: 'radio_button_unchecked', color: 'warning',  bgColor: 'rgba(242,192,55,0.12)',  borderColor: '#F2C037' },
  { label: 'En Proceso', value: ticketsStore.stats.en_proceso || 0, icon: 'sync',                   color: 'info',     bgColor: 'rgba(49,204,236,0.12)', borderColor: '#31CCEC' },
  { label: 'Resueltos',  value: ticketsStore.stats.resueltos  || 0, icon: 'check_circle',           color: 'positive', bgColor: 'rgba(33,186,69,0.12)',  borderColor: '#21BA45' }
])

const estadoItems = computed(() => [
  { label: 'Abiertos',   value: ticketsStore.stats.abiertos   || 0, color: 'warning' },
  { label: 'En Proceso', value: ticketsStore.stats.en_proceso || 0, color: 'info' },
  { label: 'Resueltos',  value: ticketsStore.stats.resueltos  || 0, color: 'positive' },
  { label: 'Cerrados',   value: ticketsStore.stats.cerrados   || 0, color: 'grey' }
])

const categoriaItems = computed(() => {
  const t = ticketsStore.tickets
  return [
    { label: 'Cancelación de Documento', icon: 'cancel',         color: 'negative', bg: 'rgba(193,0,21,0.12)',   value: t.filter(x => x.categoria === 'cancelacion_documento').length },
    { label: 'Falla PVWIN',              icon: 'computer',        color: 'primary',  bg: 'rgba(25,118,210,0.12)',value: t.filter(x => x.categoria === 'falla_pvwin').length },
    { label: 'Falla de Equipo',          icon: 'desktop_windows', color: 'warning',  bg: 'rgba(242,192,55,0.12)',value: t.filter(x => x.categoria === 'falla_computadora').length },
    { label: 'Otro',                     icon: 'help_outline',    color: 'grey',     bg: 'rgba(128,128,128,0.12)',value: t.filter(x => x.categoria === 'otro').length }
  ]
})

function getCategoryIcon(cat)   { return { cancelacion_documento: 'cancel', falla_pvwin: 'computer', falla_computadora: 'desktop_windows', otro: 'help_outline' }[cat] || 'help_outline' }
function getCategoryLabel(cat)  { return { cancelacion_documento: 'Cancelación', falla_pvwin: 'Falla PVWIN', falla_computadora: 'Falla Equipo', otro: 'Otro' }[cat] || cat }
function getCategoryColor(cat)  { return { cancelacion_documento: 'negative', falla_pvwin: 'primary', falla_computadora: 'warning', otro: 'grey' }[cat] || 'grey' }
function getCategoryBg(cat)     { return { cancelacion_documento: 'rgba(193,0,21,0.08)', falla_pvwin: 'rgba(25,118,210,0.1)', falla_computadora: 'rgba(242,192,55,0.1)', otro: 'rgba(0,0,0,0.05)' }[cat] || 'rgba(0,0,0,0.05)' }
function getEstadoColor(e)      { return { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }[e] || 'grey' }
function getEstadoLabel(e)      { return { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }[e] || e }
function formatDate(dateStr)    { return format(new Date(dateStr), "dd MMM yyyy", { locale: es }) }
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
.stat-card {
  border-radius: 12px !important;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
}
.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-icon-wrap-sm {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.estado-badge {
  font-size: 11px;
  padding: 4px 8px;
}
</style>
