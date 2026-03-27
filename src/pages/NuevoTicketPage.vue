<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" />
      <div class="q-ml-sm">
        <div class="text-h5 text-white text-weight-bold">Nuevo Reporte</div>
        <div class="text-blue-2 text-caption q-mt-xs">Completa el formulario para levantar un reporte</div>
      </div>
    </div>

    <q-card bordered style="max-width: 820px; margin: 0 auto">
      <q-card-section>
        <q-form ref="formRef" @submit="handleSubmit" class="q-gutter-md">

          <q-select v-model="form.categoria" outlined label="Tipo de problema *"
            :options="categorias" emit-value map-options
            :rules="[val => !!val || 'Selecciona una categoría']"
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
            <div class="text-subtitle1 text-primary text-weight-bold">
              <q-icon name="cancel" class="q-mr-xs" /> Detalle de Cancelación
            </div>
            <q-select v-model="form.tipo_documento" outlined label="Tipo de documento a cancelar *"
              :options="tiposDocumento" emit-value map-options
              :rules="[val => !!val || 'Selecciona el tipo de documento']" />
            <q-select v-if="form.tipo_documento === 'traspaso'" v-model="form.tipo_traspaso"
              outlined label="Tipo de traspaso *"
              :options="[{ label: 'Entrada', value: 'entrada' }, { label: 'Salida', value: 'salida' }]"
              emit-value map-options
              :rules="[val => !!val || 'Indica si es entrada o salida']" />

            <q-input v-model="form.folio_pvwin" outlined label="Folio a cancelar *"
              hint="Número de folio incorrecto o a cancelar"
              :rules="[val => !!val || 'El folio es requerido']" />

            <!-- Foto documento a cancelar -->
            <div>
              <div class="text-caption text-grey-6 q-mb-xs">Foto del documento a cancelar (opcional)</div>
              <input type="file" accept="image/*" capture="environment" ref="inputFotoCancelar"
                style="display:none" @change="e => setFoto(e, 'foto_cancelar')" />
              <div class="row items-center q-gutter-sm">
                <q-btn flat color="primary" icon="camera_alt" label="Tomar foto"
                  @click="inputFotoCancelar.click()" />
                <q-btn v-if="form.foto_cancelar" flat color="negative" icon="delete" dense
                  @click="form.foto_cancelar = null" />
              </div>
              <q-img v-if="form.foto_cancelar" :src="form.foto_cancelar"
                style="max-height: 220px; border-radius: 10px; margin-top: 8px" fit="contain" />
            </div>

            <q-input v-model="form.folio_correcto" outlined label="Folio correcto (opcional)"
              hint="Folio que reemplaza al cancelado, si aplica" />

            <!-- Foto documento correcto -->
            <div>
              <div class="text-caption text-grey-6 q-mb-xs">Foto del documento correcto (opcional)</div>
              <input type="file" accept="image/*" capture="environment" ref="inputFotoCorrector"
                style="display:none" @change="e => setFoto(e, 'foto_correcto')" />
              <div class="row items-center q-gutter-sm">
                <q-btn flat color="primary" icon="camera_alt" label="Tomar foto"
                  @click="inputFotoCorrector.click()" />
                <q-btn v-if="form.foto_correcto" flat color="negative" icon="delete" dense
                  @click="form.foto_correcto = null" />
              </div>
              <q-img v-if="form.foto_correcto" :src="form.foto_correcto"
                style="max-height: 220px; border-radius: 10px; margin-top: 8px" fit="contain" />
            </div>

            <q-input v-model="form.descripcion" outlined label="Motivo de la cancelación *"
              type="textarea" rows="3"
              :rules="[val => !!val || 'Indica el motivo de la cancelación']" />
          </template>

          <!-- Falla PVWIN -->
          <template v-if="form.categoria === 'falla_pvwin'">
            <q-separator />
            <div class="text-subtitle1 text-primary text-weight-bold">
              <q-icon name="computer" class="q-mr-xs" /> Detalle de Falla en PVWIN
            </div>
            <q-input v-model="form.folio_pvwin" outlined label="Folio del documento afectado (opcional)"
              hint="Si la falla está relacionada con un folio específico" />
            <q-input v-model="form.detalle_falla" outlined label="Descripción de la falla *"
              type="textarea" rows="5" hint="Describe con detalle qué está fallando en PVWIN"
              :rules="[val => !!val || 'La descripción es requerida']" />
            <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
              type="textarea" rows="3" hint="Cualquier información extra que pueda ayudar a soporte" />
          </template>

          <!-- Falla de equipo -->
          <template v-if="form.categoria === 'falla_computadora'">
            <q-separator />
            <div class="text-subtitle1 text-primary text-weight-bold">
              <q-icon name="desktop_windows" class="q-mr-xs" /> Detalle del Equipo
            </div>
            <q-select v-model="form.tipo_falla" outlined label="Tipo de falla *"
              :options="tiposFallaEquipo" emit-value map-options
              :rules="[val => !!val || 'Selecciona el tipo de falla']" />
            <q-input v-model="form.detalle_falla" outlined label="Descripción del problema *"
              type="textarea" rows="5" hint="Describe qué le ocurre al equipo"
              :rules="[val => !!val || 'La descripción es requerida']" />
            <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
              type="textarea" rows="3" hint="Cualquier información extra que pueda ayudar a soporte" />
          </template>

          <!-- Otro -->
          <template v-if="form.categoria === 'otro'">
            <q-separator />
            <div class="text-subtitle1 text-primary text-weight-bold">
              <q-icon name="help_outline" class="q-mr-xs" /> Detalle
            </div>
            <q-input v-model="form.detalle_falla" outlined label="Descripción del problema *"
              type="textarea" rows="5"
              :rules="[val => !!val || 'La descripción es requerida']" />
            <q-input v-model="form.descripcion" outlined label="Observaciones adicionales (opcional)"
              type="textarea" rows="3" hint="Cualquier información extra que pueda ayudar a soporte" />
          </template>

          <div class="row justify-center q-gutter-sm q-pt-sm">
            <q-btn flat label="Cancelar" @click="$router.back()" />
            <q-btn type="submit" label="Crear Ticket" color="primary" unelevated icon="send" :loading="loading" />
          </div>

        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTicketsStore } from '../stores/tickets'
import { useQuasar } from 'quasar'
import api from '../lib/api'

const router = useRouter()
const ticketsStore = useTicketsStore()
const $q = useQuasar()
const loading = ref(false)
const formRef = ref(null)
const inputFotoCancelar = ref(null)
const inputFotoCorrector = ref(null)
const form = ref({
  titulo: '', categoria: null, descripcion: '',
  tipo_documento: null, folio_pvwin: '', folio_correcto: '',
  detalle_falla: '', tipo_falla: null,
  foto_cancelar: null, foto_correcto: null, tipo_traspaso: null
})

const categorias = [
  { label: 'Cancelación de Documento',      value: 'cancelacion_documento', icon: 'cancel' },
  { label: 'Falla en PVWIN',                value: 'falla_pvwin',           icon: 'computer' },
  { label: 'Falla en Equipo / Computadora', value: 'falla_computadora',     icon: 'desktop_windows' },
  { label: 'Otro',                           value: 'otro',                  icon: 'help_outline' }
]

const tiposDocumento = ref([])
const tiposFallaEquipo = ref([])

onMounted(async () => {
  try {
    const [resDoc, resFalla] = await Promise.all([
      api.get('/catalogos?tipo=tipos_documento'),
      api.get('/catalogos?tipo=tipos_falla_equipo')
    ])
    tiposDocumento.value = (resDoc.data || []).map(c => ({ label: c.label, value: c.value }))

    // Rebuild grouped list for falla equipo (insert group headers from "grupo" field)
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
  } catch {
    // Fallback silencioso; el usuario verá el campo vacío
  }
})

watch(() => form.value.tipo_documento, () => { form.value.tipo_traspaso = null })

function setFoto(e, campo) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { form.value[campo] = ev.target.result }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function resetCamposCategoria() {
  form.value.tipo_documento = null
  form.value.folio_pvwin    = ''
  form.value.folio_correcto = ''
  form.value.detalle_falla  = ''
  form.value.tipo_falla     = null
  form.value.descripcion    = ''
  form.value.foto_cancelar  = null
  form.value.foto_correcto  = null
  form.value.tipo_traspaso  = null
}

async function handleSubmit() {
  loading.value = true
  try {
    const titulosAuto = {
      cancelacion_documento: 'Cancelación de Documento',
      falla_pvwin:           'Falla en PVWIN',
      falla_computadora:     'Falla en Equipo / Computadora',
      otro:                  'Otro'
    }
    const payload = { ...form.value, titulo: titulosAuto[form.value.categoria] || form.value.categoria }
    const ticket = await ticketsStore.crearTicket(payload)
    $q.notify({ type: 'positive', message: `Ticket ${ticket.folio} creado correctamente` })
    router.push(`/tickets/${ticket.id}`)
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al crear el ticket: ' + e.message })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
</style>
