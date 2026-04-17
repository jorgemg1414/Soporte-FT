<template>
  <q-dialog v-model="model" position="right" full-height :seamless="false">
    <q-card style="width: 320px; border-radius: 0; display: flex; flex-direction: column; max-height: 100vh">

      <!-- Header -->
      <q-card-section class="row items-center q-pb-sm q-pt-md q-px-md" :style="{ background: themeStore.headerGradient }">
        <q-icon name="palette" color="white" size="22px" class="q-mr-sm" />
        <span class="text-white text-weight-bold" style="font-size: 16px">Personalización</span>
        <q-space />
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <q-scroll-area style="flex: 1">

        <!-- ─── Temas predefinidos ─── -->
        <q-card-section>
          <div class="section-label">Temas predefinidos</div>
          <div class="row q-gutter-sm q-mt-xs flex-wrap">
            <div
              v-for="preset in PRESETS" :key="preset.name"
              class="preset-bubble cursor-pointer"
              :style="{ background: preset.primary }"
              :class="{ 'preset-active': isActivePreset(preset) }"
              @click="applyPreset(preset)"
            >
              <q-tooltip anchor="top middle" self="bottom middle">{{ preset.name }}</q-tooltip>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <!-- ─── Nombre de la app ─── -->
        <q-card-section>
          <div class="section-label">Nombre de la aplicación</div>
          <div class="text-caption text-grey-6 q-mb-sm">Se muestra en el header y sidebar</div>
          <q-input
            v-model="localAppName"
            dense outlined
            placeholder="Centro de Soporte"
            maxlength="32"
            @update:model-value="themeStore.setColor('appName', $event)"
          >
            <template #prepend><q-icon name="label" /></template>
          </q-input>
        </q-card-section>

        <q-separator />

        <!-- ─── Colores ─── -->
        <q-card-section>
          <div class="section-label">Colores</div>

          <!-- Primario -->
          <div class="color-row q-mb-sm">
            <div class="color-swatch" :style="{ background: themeStore.primary }">
              <q-popup-proxy transition-show="scale" transition-hide="scale">
                <q-color v-model="localPrimary" no-footer @update:model-value="v => themeStore.setColor('primary', v)" />
              </q-popup-proxy>
            </div>
            <div style="flex: 1">
              <div class="color-label">Primario</div>
              <div class="text-caption text-grey-6">Header, botones, activos</div>
            </div>
            <q-input v-model="localPrimary" dense outlined style="width: 100px"
              @update:model-value="onHexInput('primary', $event)">
              <template #prepend><span class="text-grey-6 text-caption">#</span></template>
            </q-input>
          </div>

          <!-- Secundario -->
          <div class="color-row q-mb-sm">
            <div class="color-swatch" :style="{ background: themeStore.secondary }">
              <q-popup-proxy transition-show="scale" transition-hide="scale">
                <q-color v-model="localSecondary" no-footer @update:model-value="v => themeStore.setColor('secondary', v)" />
              </q-popup-proxy>
            </div>
            <div style="flex: 1">
              <div class="color-label">Secundario</div>
              <div class="text-caption text-grey-6">Chips, badges</div>
            </div>
            <q-input v-model="localSecondary" dense outlined style="width: 100px"
              @update:model-value="onHexInput('secondary', $event)">
              <template #prepend><span class="text-grey-6 text-caption">#</span></template>
            </q-input>
          </div>

          <!-- Acento -->
          <div class="color-row">
            <div class="color-swatch" :style="{ background: themeStore.accent }">
              <q-popup-proxy transition-show="scale" transition-hide="scale">
                <q-color v-model="localAccent" no-footer @update:model-value="v => themeStore.setColor('accent', v)" />
              </q-popup-proxy>
            </div>
            <div style="flex: 1">
              <div class="color-label">Acento</div>
              <div class="text-caption text-grey-6">Destacados especiales</div>
            </div>
            <q-input v-model="localAccent" dense outlined style="width: 100px"
              @update:model-value="onHexInput('accent', $event)">
              <template #prepend><span class="text-grey-6 text-caption">#</span></template>
            </q-input>
          </div>
        </q-card-section>

        <q-separator />

        <!-- ─── Radio de tarjetas ─── -->
        <q-card-section>
          <div class="row items-center q-mb-xs">
            <div class="section-label" style="margin-bottom: 0">Redondez de tarjetas</div>
            <q-space />
            <q-badge color="grey-5" text-color="white" :label="`${localRadius}px`" />
          </div>
          <div class="text-caption text-grey-6 q-mb-md">Esquinas de tickets, cards y paneles</div>
          <div class="row items-center q-gutter-sm">
            <q-icon name="crop_square" color="grey-5" />
            <q-slider
              v-model="localRadius"
              :min="0" :max="24" :step="2"
              color="primary" style="flex: 1"
              @update:model-value="themeStore.setColor('cardRadius', $event)"
            />
            <q-icon name="rounded_corner" color="grey-5" />
          </div>
          <!-- Preview de redondez -->
          <div class="row q-gutter-sm q-mt-sm">
            <div class="radius-preview" :style="{ borderRadius: `${localRadius}px`, background: themeStore.headerGradient }">
              <q-icon name="confirmation_number" color="white" size="20px" />
            </div>
            <div class="radius-preview radius-preview--outline" :style="{ borderRadius: `${localRadius}px`, borderColor: themeStore.primary }">
              <q-icon name="chat" :color="'primary'" size="20px" />
            </div>
            <div class="radius-preview" :style="{ borderRadius: `${localRadius}px`, background: themeStore.primaryAlpha(0.12) }">
              <q-icon name="bar_chart" color="primary" size="20px" />
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <!-- ─── Densidad ─── -->
        <q-card-section>
          <div class="section-label">Densidad de interfaz</div>
          <div class="text-caption text-grey-6 q-mb-sm">Espacio entre elementos</div>
          <div class="row q-gutter-sm">
            <q-btn
              v-for="d in densityOptions" :key="d.value"
              :outline="themeStore.density !== d.value"
              :unelevated="themeStore.density === d.value"
              :color="themeStore.density === d.value ? 'primary' : 'grey-5'"
              :text-color="themeStore.density === d.value ? 'white' : undefined"
              size="sm" style="flex: 1"
              @click="setDensity(d.value)"
            >
              <div class="column items-center q-pa-xs">
                <q-icon :name="d.icon" size="18px" />
                <span style="font-size: 11px; margin-top: 2px">{{ d.label }}</span>
              </div>
            </q-btn>
          </div>
        </q-card-section>

        <q-separator />

        <!-- ─── Fondo de página ─── -->
        <q-card-section>
          <div class="section-label">Fondo de página</div>
          <div class="text-caption text-grey-6 q-mb-sm">Solo afecta el modo claro</div>
          <div class="row q-gutter-xs q-mb-sm flex-wrap">
            <div
              v-for="bg in bgPresets" :key="bg.value"
              class="bg-preset cursor-pointer"
              :style="{ background: bg.value, borderColor: themeStore.pageBg === bg.value ? themeStore.primary : 'transparent' }"
              @click="setBg(bg.value)"
            >
              <q-tooltip>{{ bg.label }}</q-tooltip>
            </div>
          </div>
          <div class="row items-center q-gutter-sm">
            <div class="color-swatch" :style="{ background: themeStore.pageBg }">
              <q-popup-proxy transition-show="scale" transition-hide="scale">
                <q-color v-model="localPageBg" no-footer @update:model-value="setBg($event)" />
              </q-popup-proxy>
            </div>
            <q-input v-model="localPageBg" dense outlined style="flex: 1"
              label="Hex personalizado"
              @update:model-value="v => isValidHex(v) ? setBg(normalizeHex(v)) : null">
              <template #prepend><span class="text-grey-6 text-caption">#</span></template>
            </q-input>
          </div>
        </q-card-section>

        <q-separator />

        <!-- ─── Vista previa ─── -->
        <q-card-section>
          <div class="section-label q-mb-sm">Vista previa</div>
          <div class="preview-header row items-center q-px-md q-py-sm q-mb-sm" :style="{ background: themeStore.headerGradient, borderRadius: `${localRadius}px` }">
            <q-icon name="confirmation_number" color="white" size="18px" class="q-mr-sm" />
            <span class="text-white text-weight-medium" style="font-size: 13px">{{ themeStore.appName }}</span>
          </div>
          <div class="row q-gutter-sm">
            <q-btn color="primary" unelevated label="Primario" size="sm" />
            <q-btn color="secondary" unelevated label="Secundario" size="sm" />
            <q-btn color="accent" unelevated label="Acento" size="sm" />
          </div>
          <div class="row q-gutter-sm q-mt-sm items-center">
            <q-badge color="primary" label="Badge" />
            <q-chip color="primary" text-color="white" size="sm" icon="star" label="Chip" />
            <q-linear-progress :value="0.65" color="primary" style="height: 6px; border-radius: 3px; flex: 1; margin-top: 4px" />
          </div>
        </q-card-section>

      </q-scroll-area>

      <!-- ─── Acciones ─── -->
      <q-separator />
      <q-card-actions class="q-pa-md row">
        <q-btn flat label="Restablecer" icon="restart_alt" size="sm" @click="reset" />
        <q-space />
        <q-btn color="primary" unelevated label="Guardar" icon="save" size="sm" @click="save" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useThemeStore, PRESETS, DEFAULTS } from '../stores/theme'

const model = defineModel({ default: false })
const themeStore = useThemeStore()
const $q = useQuasar()

// Copias locales sincronizadas con el store
const localPrimary   = ref(themeStore.primary)
const localSecondary = ref(themeStore.secondary)
const localAccent    = ref(themeStore.accent)
const localAppName   = ref(themeStore.appName)
const localRadius    = ref(themeStore.cardRadius)
const localPageBg    = ref(themeStore.pageBg)

watch(() => themeStore.primary,    v => { localPrimary.value   = v })
watch(() => themeStore.secondary,  v => { localSecondary.value = v })
watch(() => themeStore.accent,     v => { localAccent.value    = v })
watch(() => themeStore.appName,    v => { localAppName.value   = v })
watch(() => themeStore.cardRadius, v => { localRadius.value    = v })
watch(() => themeStore.pageBg,     v => { localPageBg.value    = v })

// Densidad
const densityOptions = [
  { value: 'compact',     label: 'Compacto',  icon: 'density_small'  },
  { value: 'normal',      label: 'Normal',    icon: 'density_medium' },
  { value: 'comfortable', label: 'Cómodo',    icon: 'density_large'  },
]

function setDensity(val) {
  themeStore.setColor('density', val)
}

// Fondos de página predefinidos
const bgPresets = [
  { label: 'Gris suave',  value: '#f5f5f5' },
  { label: 'Blanco',      value: '#ffffff' },
  { label: 'Gris frío',   value: '#eceff1' },
  { label: 'Crema',       value: '#fafaf7' },
  { label: 'Azul pálido', value: '#e8f0fe' },
  { label: 'Verde pálido',value: '#e8f5e9' },
]

function setBg(val) {
  localPageBg.value = val
  themeStore.setColor('pageBg', val)
}

// Helpers
function isValidHex(v) {
  return /^#?[0-9A-Fa-f]{6}$/.test(v)
}
function normalizeHex(v) {
  return v.startsWith('#') ? v : `#${v}`
}
function onHexInput(key, value) {
  const full = normalizeHex(value)
  if (isValidHex(full)) themeStore.setColor(key, full)
}

function applyPreset(preset) {
  localPrimary.value   = preset.primary
  localSecondary.value = preset.secondary
  localAccent.value    = preset.accent
  themeStore.applyPreset(preset)
}

function isActivePreset(preset) {
  return preset.primary === themeStore.primary &&
         preset.secondary === themeStore.secondary &&
         preset.accent === themeStore.accent
}

function save() {
  themeStore.save()
  $q.notify({ type: 'positive', message: 'Tema guardado', icon: 'palette', timeout: 1500 })
}

function reset() {
  themeStore.reset()
  localPrimary.value   = DEFAULTS.primary
  localSecondary.value = DEFAULTS.secondary
  localAccent.value    = DEFAULTS.accent
  localAppName.value   = DEFAULTS.appName
  localRadius.value    = DEFAULTS.cardRadius
  localPageBg.value    = DEFAULTS.pageBg
  $q.notify({ type: 'info', message: 'Tema restablecido', icon: 'restart_alt', timeout: 1500 })
}
</script>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #9e9e9e;
  margin-bottom: 4px;
}

/* Presets */
.preset-bubble {
  width: 32px; height: 32px;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}
.preset-bubble:hover { transform: scale(1.18); box-shadow: 0 4px 12px rgba(0,0,0,0.35); }
.preset-active {
  outline: 3px solid white;
  outline-offset: 2px;
  box-shadow: 0 0 0 5px rgba(0,0,0,0.18);
  transform: scale(1.1);
}

/* Color rows */
.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.color-swatch {
  width: 40px; height: 40px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  flex-shrink: 0;
  transition: transform 0.15s;
}
.color-swatch:hover { transform: scale(1.08); }
.color-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

/* Radius preview */
.radius-preview {
  width: 52px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  transition: border-radius 0.2s;
}
.radius-preview--outline {
  background: transparent !important;
  border: 2px solid;
}

/* Bg presets */
.bg-preset {
  width: 32px; height: 32px;
  border-radius: 6px;
  border: 2px solid;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  transition: transform 0.15s, border-color 0.15s;
}
.bg-preset:hover { transform: scale(1.12); }

/* Preview */
.preview-header {
  transition: border-radius 0.2s;
}
</style>
