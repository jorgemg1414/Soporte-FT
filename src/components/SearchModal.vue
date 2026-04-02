<template>
  <q-dialog v-model="open" position="top" transition-show="slide-down" transition-hide="slide-up"
    @show="onShow" @hide="reset">
    <q-card class="search-modal" style="width: 620px; max-width: 95vw; border-radius: 14px; overflow: hidden">

      <!-- Input -->
      <div class="row items-center q-px-md q-pt-md q-pb-sm q-gutter-sm">
        <q-icon name="search" color="primary" size="22px" />
        <q-input ref="inputRef" v-model="query" borderless dense class="col"
          placeholder="Buscar tickets por folio, título o sucursal…"
          @update:model-value="onInput"
          @keydown.down.prevent="mover(1)"
          @keydown.up.prevent="mover(-1)"
          @keydown.enter.prevent="seleccionar"
          @keydown.esc="open = false" />
        <q-spinner v-if="buscando" color="primary" size="18px" />
        <kbd v-else class="atajo-esc">Esc</kbd>
      </div>
      <q-separator />

      <!-- Resultados -->
      <q-scroll-area v-if="resultados.length > 0" style="height: 380px">
        <q-list>
          <q-item v-for="(t, i) in resultados" :key="t.id" clickable
            :class="['q-py-sm', i === activo ? 'item-activo' : '']"
            @click="ir(t)" @mouseover="activo = i">
            <q-item-section avatar>
              <div class="cat-icon-wrap" :style="`background: ${getCategoryBg(t.categoria)}`">
                <q-icon :name="getCategoryIcon(t.categoria)" :color="getCategoryColor(t.categoria)" size="18px" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label>
                <span class="text-primary text-weight-bold text-caption">{{ t.folio }}</span>
                <span class="q-ml-xs text-weight-medium">{{ t.titulo }}</span>
              </q-item-label>
              <q-item-label caption class="row items-center q-gutter-xs">
                <q-icon name="store" size="11px" />
                <span>{{ t.sucursales?.nombre || '—' }}</span>
                <span>·</span>
                <span>{{ getCategoryLabel(t.categoria) }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge :color="getEstadoColor(t.estado)" style="font-size: 10px; padding: 3px 8px">
                {{ getEstadoLabel(t.estado) }}
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>

      <!-- Sin resultados -->
      <div v-else-if="query.length >= 2 && !buscando"
        class="text-center text-grey-5 q-pa-xl">
        <q-icon name="search_off" size="40px" class="q-mb-sm" />
        <div>Sin resultados para "<strong>{{ query }}</strong>"</div>
      </div>

      <!-- Estado inicial -->
      <div v-else-if="!query" class="q-pa-md q-pb-lg">
        <div class="text-caption text-grey-6 text-weight-bold q-mb-sm" style="letter-spacing: 1px">ATAJOS</div>
        <div class="row q-gutter-sm">
          <q-chip dense icon="keyboard_arrow_up" label="↑↓ Navegar" color="grey-2" text-color="grey-7" />
          <q-chip dense icon="keyboard_return" label="Enter para abrir" color="grey-2" text-color="grey-7" />
          <q-chip dense label="Esc para cerrar" color="grey-2" text-color="grey-7" />
        </div>
      </div>

      <!-- Footer -->
      <q-separator />
      <div class="row items-center justify-between q-px-md q-py-xs text-grey-5" style="font-size: 11px">
        <span>{{ resultados.length > 0 ? `${resultados.length} resultado(s)` : 'Escribe para buscar' }}</span>
        <span>Ctrl+K para abrir</span>
      </div>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../lib/api'
import { getCategoryIcon, getCategoryColor, getCategoryBg, getCategoryLabel, getEstadoColor, getEstadoLabel } from '../composables/useTicketHelpers'

const open   = defineModel({ default: false })
const router = useRouter()

const query     = ref('')
const resultados = ref([])
const buscando  = ref(false)
const activo    = ref(0)
const inputRef  = ref(null)
let timer = null

function onShow() {
  query.value = ''
  resultados.value = []
  activo.value = 0
  setTimeout(() => inputRef.value?.focus(), 80)
}

function reset() {
  query.value = ''
  resultados.value = []
  activo.value = 0
}

function onInput(val) {
  clearTimeout(timer)
  resultados.value = []
  activo.value = 0
  if (!val || val.trim().length < 2) return
  buscando.value = true
  timer = setTimeout(async () => {
    try {
      const { data } = await api.get(`/tickets/search?q=${encodeURIComponent(val.trim())}&limit=12`)
      resultados.value = data || []
    } catch { /* silencioso */ }
    finally { buscando.value = false }
  }, 280)
}

function mover(dir) {
  if (!resultados.value.length) return
  activo.value = (activo.value + dir + resultados.value.length) % resultados.value.length
}

function seleccionar() {
  if (resultados.value[activo.value]) ir(resultados.value[activo.value])
}

function ir(ticket) {
  open.value = false
  router.push(`/tickets/${ticket.id}`)
}

// Atajo global Ctrl+K
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    open.value = !open.value
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.search-modal { box-shadow: 0 24px 80px rgba(0,0,0,0.25) !important; }
.cat-icon-wrap {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.item-activo { background: rgba(25, 118, 210, 0.10) !important; }
.body--dark .item-activo { background: rgba(25, 118, 210, 0.22) !important; }
kbd.atajo-esc {
  font-size: 11px; padding: 2px 6px; border-radius: 4px;
  background: rgba(128,128,128,0.15); color: inherit; font-family: inherit;
}
</style>
