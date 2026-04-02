<template>
  <q-page class="q-pa-md">

    <!-- Bienvenida -->
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
      <q-btn flat round icon="refresh" color="white" @click="recargar" :loading="ticketsStore.loading" />
    </div>

    <!-- Tarjetas de estadísticas -->
    <div class="row q-col-gutter-md q-mb-lg">

      <!-- Skeleton: primera carga -->
      <template v-if="ticketsStore.loading && !ticketsStore.stats.total">
        <div class="col-6 col-sm-4" v-for="i in 6" :key="i">
          <q-card bordered class="stat-card">
            <q-card-section class="q-pa-md">
              <div class="row items-center">
                <q-skeleton type="QAvatar" size="52px" class="q-mr-md" style="border-radius:12px" />
                <div>
                  <q-skeleton type="text" width="48px" height="36px" class="q-mb-xs" />
                  <q-skeleton type="text" width="80px" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </template>

      <template v-else>
        <div class="col-6 col-sm-4" v-for="card in statCards" :key="card.label">
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
      </template>

    </div>

    <!-- Gráfica de línea: tickets por día -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card bordered>
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="show_chart" color="primary" size="22px" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Tickets — Últimos 14 días</div>
          </q-card-section>
          <q-card-section>
            <q-skeleton v-if="ticketsStore.loading && !ticketsStore.stats.total"
              height="200px" style="border-radius: 8px" />
            <apexchart v-else type="area" height="200"
              :options="chartDia.options" :series="chartDia.series" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Fila: donut estado + barras categoría + barras sucursal -->
    <div class="row q-col-gutter-md q-mb-lg">

      <div class="col-12 col-md-4">
        <q-card bordered>
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="donut_large" color="primary" size="22px" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Por Estado</div>
          </q-card-section>
          <q-card-section>
            <apexchart type="donut" height="260"
              :options="chartEstado.options" :series="chartEstado.series" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card bordered>
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="category" color="primary" size="22px" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Por Categoría</div>
          </q-card-section>
          <q-card-section>
            <apexchart type="bar" height="260"
              :options="chartCategoria.options" :series="chartCategoria.series" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4" v-if="authStore.profile?.rol !== 'encargada'">
        <q-card bordered>
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="store" color="primary" size="22px" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Por Sucursal</div>
          </q-card-section>
          <q-card-section>
            <apexchart type="bar" height="260"
              :options="chartSucursal.options" :series="chartSucursal.series" />
          </q-card-section>
        </q-card>
      </div>

    </div>

    <!-- Fila: técnico + tickets recientes -->
    <div class="row q-col-gutter-md">

      <!-- Barras: por técnico -->
      <div class="col-12 col-md-4" v-if="authStore.profile?.rol !== 'encargada'">
        <q-card bordered>
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="engineering" color="positive" size="22px" class="q-mr-sm" />
            <div class="text-h6 text-weight-bold">Resueltos por técnico</div>
          </q-card-section>
          <q-card-section>
            <div v-if="!(ticketsStore.stats.por_tecnico?.length)" class="text-center text-grey-5 q-py-xl">
              <q-icon name="person_off" size="40px" /><div class="text-caption q-mt-sm">Sin datos aún</div>
            </div>
            <apexchart v-else type="bar" height="260"
              :options="chartTecnico.options" :series="chartTecnico.series" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Reportes recientes -->
      <div class="col-12" :class="authStore.profile?.rol !== 'encargada' ? 'col-md-8' : ''">
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

    </div>

  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getCategoryIcon, getCategoryLabel, getCategoryColor, getCategoryBg, getEstadoColor, getEstadoLabel, formatDate } from '../composables/useTicketHelpers'

const authStore    = useAuthStore()
const ticketsStore = useTicketsStore()
const $q           = useQuasar()

onMounted(async () => {
  await Promise.all([ticketsStore.fetchTickets(), ticketsStore.fetchStats()])
})

async function recargar() {
  await Promise.all([ticketsStore.fetchTickets(), ticketsStore.fetchStats()])
}

const isDark       = computed(() => $q.dark.isActive)
const fechaHoy     = computed(() => format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es }))
const recentTickets = computed(() => ticketsStore.tickets.slice(0, 6))

// ── Stat cards ───────────────────────────────────────────────────────────────
const statCards = computed(() => {
  const prom = ticketsStore.stats.tiempo_promedio_horas
  const promLabel = prom != null
    ? (prom < 24 ? `${prom}h` : `${Math.floor(prom / 24)}d`)
    : '—'

  return [
    { label: 'Total',           value: ticketsStore.stats.total           || 0,      icon: 'confirmation_number',    color: 'primary',  bgColor: 'rgba(25,118,210,0.12)',  borderColor: '#1976D2' },
    { label: 'Abiertos',        value: ticketsStore.stats.abiertos        || 0,      icon: 'radio_button_unchecked', color: 'warning',  bgColor: 'rgba(242,192,55,0.12)',  borderColor: '#F2C037' },
    { label: 'En Proceso',      value: ticketsStore.stats.en_proceso      || 0,      icon: 'sync',                   color: 'info',     bgColor: 'rgba(49,204,236,0.12)',  borderColor: '#31CCEC' },
    { label: 'Resueltos',       value: ticketsStore.stats.resueltos       || 0,      icon: 'check_circle',           color: 'positive', bgColor: 'rgba(33,186,69,0.12)',   borderColor: '#21BA45' },
    { label: 'Urgentes (>24h)', value: ticketsStore.stats.tickets_urgentes || 0,     icon: 'warning',                color: 'negative', bgColor: 'rgba(193,0,21,0.10)',    borderColor: '#C10015' },
    { label: 'Prom. resolución', value: promLabel,                                   icon: 'timer',                  color: 'purple',   bgColor: 'rgba(156,39,176,0.10)',   borderColor: '#9C27B0' },
    { label: 'Fuera de SLA',    value: ticketsStore.stats.sla_violations   || 0,     icon: 'timer_off',              color: 'orange',   bgColor: 'rgba(255,152,0,0.10)',    borderColor: '#FF9800' }
  ]
})

// ── Colores base ─────────────────────────────────────────────────────────────
const textColor = computed(() => isDark.value ? '#e0e0e0' : '#424242')
const gridColor = computed(() => isDark.value ? '#333333' : '#eeeeee')

// ── Gráfica: tickets por día ─────────────────────────────────────────────────
const chartDia = computed(() => {
  const dias = ticketsStore.stats.por_dia || []
  return {
    series: [{ name: 'Tickets', data: dias.map(d => d.total) }],
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      theme: { mode: isDark.value ? 'dark' : 'light' },
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      colors: ['#1976D2'],
      xaxis: { categories: dias.map(d => d.fecha.slice(5)), labels: { style: { colors: textColor.value } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { colors: textColor.value } }, min: 0, tickAmount: 3, forceNiceScale: true },
      grid: { borderColor: gridColor.value },
      dataLabels: { enabled: false },
      tooltip: { theme: isDark.value ? 'dark' : 'light' }
    }
  }
})

// ── Gráfica: donut por estado ────────────────────────────────────────────────
const chartEstado = computed(() => {
  const s = ticketsStore.stats
  return {
    series: [s.abiertos || 0, s.en_proceso || 0, s.resueltos || 0, s.cerrados || 0],
    options: {
      chart: { background: 'transparent' },
      theme: { mode: isDark.value ? 'dark' : 'light' },
      labels: ['Abiertos', 'En Proceso', 'Resueltos', 'Cerrados'],
      colors: ['#F2C037', '#31CCEC', '#21BA45', '#9E9E9E'],
      legend: { position: 'bottom', labels: { colors: textColor.value } },
      dataLabels: { style: { colors: ['#fff'] } },
      tooltip: { theme: isDark.value ? 'dark' : 'light' },
      plotOptions: { pie: { donut: { size: '60%' } } }
    }
  }
})

// ── Gráfica: barras por categoría ────────────────────────────────────────────
const catLabels = {
  cancelacion_documento: 'Cancelación',
  falla_pvwin:           'Falla PVWIN',
  falla_computadora:     'Falla Equipo',
  otro:                  'Otro'
}
const chartCategoria = computed(() => {
  const cats = [...(ticketsStore.stats.por_categoria || [])].sort((a, b) => b.total - a.total)
  return {
    series: [{ name: 'Tickets', data: cats.map(c => c.total) }],
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      theme: { mode: isDark.value ? 'dark' : 'light' },
      plotOptions: { bar: { borderRadius: 6, distributed: true } },
      colors: ['#C10015', '#1976D2', '#F2C037', '#9E9E9E'],
      xaxis: { categories: cats.map(c => catLabels[c.categoria] || c.categoria), labels: { style: { colors: textColor.value } } },
      yaxis: { labels: { style: { colors: textColor.value } }, min: 0, forceNiceScale: true },
      grid: { borderColor: gridColor.value },
      legend: { show: false },
      dataLabels: { enabled: true, style: { colors: ['#fff'] } },
      tooltip: { theme: isDark.value ? 'dark' : 'light' }
    }
  }
})

// ── Gráfica: barras horizontales por sucursal ────────────────────────────────
const chartSucursal = computed(() => {
  const sucs = ticketsStore.stats.por_sucursal || []
  return {
    series: [{ name: 'Tickets', data: sucs.map(s => s.total) }],
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      theme: { mode: isDark.value ? 'dark' : 'light' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: ['#1976D2'],
      xaxis: { categories: sucs.map(s => s.nombre), labels: { style: { colors: textColor.value } } },
      yaxis: { labels: { style: { colors: textColor.value } } },
      grid: { borderColor: gridColor.value },
      dataLabels: { enabled: false },
      tooltip: { theme: isDark.value ? 'dark' : 'light' }
    }
  }
})

// ── Gráfica: barras por técnico ──────────────────────────────────────────────
const chartTecnico = computed(() => {
  const tecs = ticketsStore.stats.por_tecnico || []
  return {
    series: [{ name: 'Resueltos', data: tecs.map(t => t.total) }],
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      theme: { mode: isDark.value ? 'dark' : 'light' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
      colors: ['#21BA45', '#1976D2', '#9C27B0', '#F2C037', '#C10015'],
      xaxis: { categories: tecs.map(t => t.nombre), labels: { style: { colors: textColor.value } } },
      yaxis: { labels: { style: { colors: textColor.value } } },
      grid: { borderColor: gridColor.value },
      legend: { show: false },
      dataLabels: { enabled: true, style: { colors: ['#fff'] } },
      tooltip: { theme: isDark.value ? 'dark' : 'light' }
    }
  }
})


</script>

<style scoped>
.stat-card {
  border-radius: 12px !important;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
}
.stat-icon-wrap {
  width: 52px; height: 52px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.cat-icon-wrap {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.estado-badge { font-size: 11px; padding: 4px 8px; }
</style>
