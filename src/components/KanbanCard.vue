<template>
  <q-card bordered class="kanban-card q-mb-sm" @click="$router.push(`/tickets/${ticket.id}`)">
    <div class="urgente-stripe" :class="{ 'urgente-on': ticket.urgente }" />
    <q-card-section class="q-pa-sm q-pl-md">
      <!-- Folio + badges -->
      <div class="row items-center no-wrap q-mb-xs">
        <span class="text-primary text-weight-bold text-caption q-mr-xs">{{ ticket.folio }}</span>
        <q-badge v-if="ticket.urgente" color="negative" style="font-size: 10px; padding: 2px 6px; border-radius: 8px">
          <q-icon name="warning" size="10px" class="q-mr-xs" />urgente
        </q-badge>
        <q-space />
        <q-badge :color="slaBadgeColor(ticket)" style="font-size: 10px; padding: 2px 6px; border-radius: 8px">
          <q-icon :name="slaIcon(ticket)" size="10px" class="q-mr-xs" />{{ slaLabel(ticket) }}
        </q-badge>
      </div>

      <!-- Título -->
      <div class="text-body2 text-weight-medium card-title q-mb-xs">{{ ticket.titulo }}</div>

      <!-- Sucursal + asignado -->
      <div class="row items-center no-wrap">
        <q-icon name="store" size="12px" color="grey-5" class="q-mr-xs" />
        <span class="text-caption text-grey-5">{{ ticket.sucursales?.nombre || '—' }}</span>
        <q-space />
        <template v-if="ticket.asignado_a">
          <q-icon name="person" size="12px" color="info" class="q-mr-xs" />
          <span class="text-caption text-info">{{ asignadoNombre }}</span>
        </template>
        <span v-else class="text-caption text-grey-4">Sin asignar</span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { useSLA } from '../composables/useSLA'

const props = defineProps({ ticket: Object, tecnicos: { type: Array, default: () => [] } })
const { slaLabel, slaBadgeColor, slaIcon } = useSLA()

const asignadoNombre = computed(() => {
  const t = props.tecnicos.find(t => t.id === props.ticket.asignado_a)
  return t?.nombre || '—'
})
</script>

<style scoped>
.kanban-card {
  cursor: pointer;
  border-radius: 8px !important;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.15s, transform 0.1s;
}
.kanban-card:hover {
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.18) !important;
  transform: translateY(-1px);
}
.urgente-stripe {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: transparent;
}
.urgente-on { background: #C10015; }
.card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
