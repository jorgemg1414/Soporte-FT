<template>
  <div>
    <!-- Tarjeta de éxito -->
    <q-card v-if="ticketCreado && showSuccessCard" bordered class="exito-card q-mb-md">
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

    <!-- Formulario -->
    <q-card v-else bordered>
      <q-card-section>
        <q-form ref="formRef" @submit="handleSubmit" class="q-gutter-md">

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

            <q-select v-if="form.tipo_documento === 'traspaso'" v-model="form.tipo_traspaso"
              outlined label="Tipo de traspaso *"
              :options="[{ label: 'Entrada', value: 'entrada' }, { label: 'Salida', value: 'salida' }]"
              emit-value map-options
              :rules="[val => !!val || 'Indica si es entrada o salida']" />

            <q-input v-model="form.folio_pvwin" outlined label="Folio a cancelar *"
              maxlength="300" counter
              :rules="[val => !!val || 'Requerido']" />

            <q-input v-model="form.folio_correcto" outlined label="Folio correcto *"
              maxlength="300" counter
              :rules="[val => !!val || 'Indica el folio correcto']" />

            <q-input v-model="form.descripcion" outlined label="Motivo de la cancelación *"
              type="textarea" rows="3" maxlength="300" counter
              :rules="[val => !!val || 'Indica el motivo de la cancelación']" />
          </template>

          <!-- Falla PVWIN -->
          <template v-if="form.categoria === 'falla_pvwin'">
            <q-separator />
            <div class="text-subtitle2 text-primary text-weight-bold">
              <q-icon name="computer" class="q-mr-xs" /> Falla en PVWIN
            </div>
            <q-input v-model="form.folio_pvwin" outlined label="Folio afectado (opcional)" maxlength="300" counter />
            <q-input v-model="form.detalle_falla" outlined label="¿Qué está pasando? *"
              type="textarea" rows="4" maxlength="300" counter
              :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
              type="textarea" rows="2" maxlength="300" counter />
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
              type="textarea" rows="4" maxlength="300" counter
              :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
              type="textarea" rows="2" maxlength="300" counter />
          </template>

          <!-- Otro -->
          <template v-if="form.categoria === 'otro'">
            <q-separator />
            <q-input v-model="form.detalle_falla" outlined label="Describe el problema *"
              type="textarea" rows="4" maxlength="300" counter
              :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
              type="textarea" rows="2" maxlength="300" counter />
          </template>

          <div class="flex flex-center q-pt-sm">
            <q-btn type="submit" :label="submitLabel" color="primary" unelevated icon="send"
              :loading="loading" size="lg" style="border-radius: 10px; min-width: 220px" />
          </div>

        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTicketsStore } from '../stores/tickets'
import { useQuasar } from 'quasar'
import { useCatalogos } from '../composables/useCatalogos'
import { TITULOS_AUTO } from '../composables/useTicketHelpers'
import api from '../lib/api'

const props = defineProps({
  showSuccessCard: { type: Boolean, default: true },
  submitLabel: { type: String, default: 'Enviar Reporte' }
})

const emit = defineEmits(['created'])

const ticketsStore = useTicketsStore()
const $q = useQuasar()
const { tiposDocumento, tiposFallaEquipo, cargarCatalogos } = useCatalogos()

const loading = ref(false)
const formRef = ref(null)
const ticketCreado = ref(null)

const form = ref({
  titulo: '', categoria: null, descripcion: '',
  tipo_documento: null, folio_pvwin: '', folio_correcto: '',
  detalle_falla: '', tipo_falla: null, tipo_traspaso: null
})

const categorias = [
  { label: 'Cancelación de Documento',      value: 'cancelacion_documento', icon: 'cancel' },
  { label: 'Falla en PVWIN',                value: 'falla_pvwin',           icon: 'computer' },
  { label: 'Falla en Equipo / Computadora', value: 'falla_computadora',     icon: 'desktop_windows' },
  { label: 'Otro',                           value: 'otro',                  icon: 'help_outline' }
]

onMounted(cargarCatalogos)

watch(() => form.value.tipo_documento, () => { form.value.tipo_traspaso = null })

function resetCamposCategoria() {
  form.value.tipo_documento = null
  form.value.folio_pvwin    = ''
  form.value.folio_correcto = ''
  form.value.detalle_falla  = ''
  form.value.tipo_falla     = null
  form.value.descripcion    = ''
  form.value.tipo_traspaso  = null
}

function resetForm() {
  ticketCreado.value = null
  form.value = { titulo: '', categoria: null, descripcion: '', tipo_documento: null, folio_pvwin: '', folio_correcto: '', detalle_falla: '', tipo_falla: null, tipo_traspaso: null }
}

async function handleSubmit() {
  loading.value = true
  try {
    const payload = { ...form.value, titulo: TITULOS_AUTO[form.value.categoria] || form.value.categoria }

    // Verificar duplicados antes de crear
    if (form.value.detalle_falla || form.value.descripcion) {
      try {
        const { data: dupCheck } = await api.post('/tickets/check-duplicados', {
          titulo: payload.titulo,
          descripcion: `${form.value.descripcion || ''} ${form.value.detalle_falla || ''}`.trim(),
          categoria: form.value.categoria
        })
        if (dupCheck.duplicados?.length > 0) {
          const dup = dupCheck.duplicados[0]
          const proceed = await new Promise(resolve => {
            $q.dialog({
              title: 'Posible ticket duplicado',
              message: `Existe un ticket similar abierto:<br><strong>${dup.folio}</strong> — ${dup.titulo}<br>Sucursal: ${dup.sucursal} · Estado: ${dup.estado}`,
              html: true,
              cancel: { label: 'Cancelar', flat: true },
              ok: { label: 'Crear de todas formas', color: 'primary', unelevated: true },
              persistent: true
            }).onOk(() => resolve(true)).onCancel(() => resolve(false))
          })
          if (!proceed) { loading.value = false; return }
        }
      } catch { /* silencioso */ }
    }

    const ticket = await ticketsStore.crearTicket(payload)
    ticketCreado.value = ticket
    emit('created', ticket)
    await ticketsStore.fetchTickets()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al crear el reporte: ' + e.message })
  } finally {
    loading.value = false
  }
}

defineExpose({ resetForm })
</script>

<style scoped>
.exito-card { border-left: 4px solid var(--q-positive); border-radius: 12px !important; }
</style>
