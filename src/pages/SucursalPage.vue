<template>
  <q-page class="sucursal-page">

    <!-- Header de sucursal -->
    <div class="sucursal-header q-pa-md">
      <div class="text-h6 text-white text-weight-bold">
        <q-icon name="store" class="q-mr-xs" />{{ authStore.profile?.sucursales?.nombre }}
      </div>
      <div class="text-blue-2 text-caption">Sistema de Reportes · {{ fechaHoy }}</div>
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

        <q-card v-if="ticketCreado" bordered class="exito-card q-mb-md">
          <q-card-section class="row items-center q-gutter-sm">
            <q-icon name="check_circle" color="positive" size="40px" />
            <div>
              <div class="text-h6 text-positive text-weight-bold">¡Reporte enviado!</div>
              <div class="text-body2 text-grey-7">Folio <strong>{{ ticketCreado.folio }}</strong> — el equipo de sistemas lo atenderá pronto.</div>
            </div>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md row q-gutter-sm">
            <q-btn unelevated color="primary" icon="visibility" label="Ver mi reporte"
              @click="$router.push(`/tickets/${ticketCreado.id}`)" class="col" />
            <q-btn flat color="primary" icon="add" label="Nuevo reporte" @click="resetForm" class="col" />
          </q-card-actions>
        </q-card>

        <q-card v-else bordered>
          <q-card-section>
            <q-form ref="formRef" @submit="handleSubmit" class="q-gutter-md">

              <q-input v-model="form.titulo" outlined label="¿Cuál es el problema? *"
                hint="Describe brevemente la falla"
                :rules="[val => !!val || 'Requerido']" />

              <q-select v-model="form.categoria" outlined label="Tipo de problema *"
                :options="categorias" emit-value map-options
                :rules="[val => !!val || 'Selecciona el tipo']"
                @update:model-value="resetCamposCategoria">
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar><q-icon :name="scope.opt.icon" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>{{ scope.opt.label }}</q-item-label></q-item-section>
                  </q-item>
                </template>
              </q-select>

              <!-- Cancelación de documento -->
              <template v-if="form.categoria === 'cancelacion_documento'">
                <q-separator />
                <div class="text-subtitle2 text-primary text-weight-bold">
                  <q-icon name="cancel" class="q-mr-xs" /> Datos de Cancelación
                </div>
                <q-select v-model="form.tipo_documento" outlined label="Tipo de documento *"
                  :options="tiposDocumento" emit-value map-options
                  :rules="[val => !!val || 'Selecciona el tipo']" />
                <q-input v-model="form.folio_pvwin" outlined label="Folio a cancelar *"
                  :rules="[val => !!val || 'Requerido']" />
                <q-input v-model="form.folio_correcto" outlined label="Folio correcto (si aplica)" />
              </template>

              <!-- Falla PVWIN -->
              <template v-if="form.categoria === 'falla_pvwin'">
                <q-separator />
                <div class="text-subtitle2 text-primary text-weight-bold">
                  <q-icon name="computer" class="q-mr-xs" /> Falla en PVWIN
                </div>
                <q-input v-model="form.folio_pvwin" outlined label="Folio afectado (opcional)" />
                <q-input v-model="form.detalle_falla" outlined label="¿Qué está pasando? *"
                  type="textarea" rows="4"
                  :rules="[val => !!val || 'Requerido']" />
              </template>

              <!-- Falla equipo -->
              <template v-if="form.categoria === 'falla_computadora'">
                <q-separator />
                <div class="text-subtitle2 text-primary text-weight-bold">
                  <q-icon name="desktop_windows" class="q-mr-xs" /> Falla de Equipo
                </div>
                <q-select v-model="form.tipo_falla" outlined label="Tipo de falla *"
                  :options="tiposFallaEquipo" emit-value map-options
                  :rules="[val => !!val || 'Selecciona el tipo']" />
                <q-input v-model="form.detalle_falla" outlined label="Describe el problema *"
                  type="textarea" rows="4"
                  :rules="[val => !!val || 'Requerido']" />
              </template>

              <!-- Otro -->
              <template v-if="form.categoria === 'otro'">
                <q-separator />
                <q-input v-model="form.detalle_falla" outlined label="Describe el problema *"
                  type="textarea" rows="4"
                  :rules="[val => !!val || 'Requerido']" />
              </template>

              <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
                type="textarea" rows="2" />

              <div class="flex flex-center q-pt-sm">
                <q-btn type="submit" label="Enviar Reporte" color="primary" unelevated icon="send"
                  :loading="loading" size="lg" style="border-radius: 10px; min-width: 220px" />
              </div>

            </q-form>
          </q-card-section>
        </q-card>

        </div>
      </q-tab-panel>

      <!-- ─── TAB: MIS REPORTES ─── -->
      <q-tab-panel name="mis" class="q-pa-sm">

        <div v-if="ticketsStore.loading" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="50px" />
        </div>

        <div v-else-if="ticketsStore.tickets.length === 0" class="text-center text-grey-5 q-pa-xl">
          <q-icon name="inbox" size="60px" class="q-mb-md" />
          <div class="text-h6">Sin reportes aún</div>
          <div class="text-caption">Crea tu primer reporte en la pestaña anterior</div>
        </div>

        <div v-else class="q-gutter-sm">
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
                <span class="text-caption text-grey-5">{{ formatDate(ticket.created_at) }}</span>
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
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTicketsStore } from '../stores/tickets'
import { useQuasar } from 'quasar'
import api from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const router = useRouter()
const authStore = useAuthStore()
const ticketsStore = useTicketsStore()
const $q = useQuasar()

const tab = ref('nuevo')
const loading = ref(false)
const formRef = ref(null)
const ticketCreado = ref(null)
const filtroActivo = ref(null)

const fechaHoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

const form = ref({
  titulo: '', categoria: null, descripcion: '',
  tipo_documento: null, folio_pvwin: '', folio_correcto: '',
  detalle_falla: '', tipo_falla: null
})

const categorias = [
  { label: 'Cancelación de Documento',      value: 'cancelacion_documento', icon: 'cancel' },
  { label: 'Falla en PVWIN',                value: 'falla_pvwin',           icon: 'computer' },
  { label: 'Falla en Equipo / Computadora', value: 'falla_computadora',     icon: 'desktop_windows' },
  { label: 'Otro',                           value: 'otro',                  icon: 'help_outline' }
]

const tiposDocumento = ref([])
const tiposFallaEquipo = ref([])

const filtrosRapidos = [
  { label: 'Todos',       value: null,         color: 'grey-4' },
  { label: 'Abierto',     value: 'abierto',    color: 'warning' },
  { label: 'En Proceso',  value: 'en_proceso', color: 'info' },
  { label: 'Resuelto',    value: 'resuelto',   color: 'positive' },
  { label: 'Cerrado',     value: 'cerrado',    color: 'grey-6' }
]

const ticketsFiltrados = computed(() =>
  ticketsStore.tickets.filter(t => !filtroActivo.value || t.estado === filtroActivo.value)
)

function contarEstado(estado) {
  if (!estado) return ticketsStore.tickets.length
  return ticketsStore.tickets.filter(t => t.estado === estado).length
}

onMounted(async () => {
  ticketsStore.fetchTickets()
  try {
    const [resDoc, resFalla] = await Promise.all([
      api.get('/catalogos?tipo=tipos_documento'),
      api.get('/catalogos?tipo=tipos_falla_equipo')
    ])
    tiposDocumento.value = (resDoc.data || []).map(c => ({ label: c.label, value: c.value }))
    const fallaRaw = resFalla.data || []
    const grupos = [...new Set(fallaRaw.map(c => c.grupo).filter(Boolean))]
    const grouped = []
    for (const g of grupos) {
      grouped.push({ label: `── ${g} ──`, value: null, disable: true })
      fallaRaw.filter(c => c.grupo === g).forEach(c => grouped.push({ label: c.label, value: c.value }))
    }
    const sinGrupo = fallaRaw.filter(c => !c.grupo)
    if (sinGrupo.length) {
      grouped.push({ label: '── Otro ──', value: null, disable: true })
      sinGrupo.forEach(c => grouped.push({ label: c.label, value: c.value }))
    }
    tiposFallaEquipo.value = grouped
  } catch { /* silencioso */ }
})

function resetCamposCategoria() {
  form.value.tipo_documento = null
  form.value.folio_pvwin    = ''
  form.value.folio_correcto = ''
  form.value.detalle_falla  = ''
  form.value.tipo_falla     = null
}

function resetForm() {
  ticketCreado.value = null
  form.value = { titulo: '', categoria: null, descripcion: '', tipo_documento: null, folio_pvwin: '', folio_correcto: '', detalle_falla: '', tipo_falla: null }
}

async function handleSubmit() {
  loading.value = true
  try {
    const ticket = await ticketsStore.crearTicket({ ...form.value })
    ticketCreado.value = ticket
    await ticketsStore.fetchTickets()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al crear el reporte: ' + e.message })
  } finally {
    loading.value = false
  }
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
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es })
}
</script>

<style scoped>
.sucursal-header {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
}
.tab-bar {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
}
.ticket-card {
  cursor: pointer;
  transition: box-shadow 0.15s;
  border-radius: 12px !important;
}
.ticket-card:hover { box-shadow: 0 4px 16px rgba(25, 118, 210, 0.15) !important; }
.exito-card { border-left: 4px solid var(--q-positive); border-radius: 12px !important; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
