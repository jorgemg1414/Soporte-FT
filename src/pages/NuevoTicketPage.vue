<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" />
      <div class="q-ml-sm">
        <div class="text-h5 text-white text-weight-bold">Nuevo Reporte</div>
        <div class="text-blue-2 text-caption q-mt-xs">Completa el formulario para levantar un reporte</div>
      </div>
    </div>

    <div style="max-width: 820px; margin: 0 auto">
      <TicketForm
        :show-success-card="false"
        submit-label="Crear Ticket"
        @created="onCreated"
      />
      <div class="row justify-center q-mt-sm">
        <q-btn flat label="Cancelar" @click="$router.back()" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import TicketForm from '../components/TicketForm.vue'

const router = useRouter()
const $q = useQuasar()

function onCreated(ticket) {
  $q.notify({ type: 'positive', message: `Ticket ${ticket.folio} creado correctamente` })
  router.push(`/tickets/${ticket.id}`)
}
</script>

<style scoped>
</style>
