<template>
  <q-page class="q-pa-md">
    <div class="welcome-banner row items-center q-pa-lg q-mb-lg">
      <div>
        <div class="text-h5 text-white text-weight-bold">Administración</div>
        <div class="text-blue-2 text-caption q-mt-xs">Gestiona usuarios y sucursales del sistema</div>
      </div>
      <q-space />
      <q-icon name="admin_panel_settings" color="white" size="48px" style="opacity: 0.6" />
    </div>

    <q-tabs v-model="tab" align="left" active-color="primary" indicator-color="primary" class="q-mb-md">
      <q-tab name="sucursales" icon="store"             label="Sucursales" />
      <q-tab name="usuarios"   icon="people"            label="Usuarios" />
      <q-tab name="catalogos"  icon="category"          label="Catálogos" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>

      <!-- SUCURSALES -->
      <q-tab-panel name="sucursales" class="q-pa-none">
        <q-card bordered>
          <q-card-section class="row items-center">
            <div class="text-h6">Sucursales registradas</div>
            <q-space />
            <q-btn color="primary" icon="add" label="Agregar sucursal" unelevated @click="abrirDialogSucursal()" />
          </q-card-section>
          <q-separator />
          <q-table :rows="sucursales" :columns="colsSucursales" row-key="id" flat :loading="cargando"
            no-data-label="No hay sucursales registradas">
            <template #body-cell-created_at="props">
              <q-td :props="props">{{ new Date(props.value).toLocaleDateString('es-MX') }}</q-td>
            </template>
            <template #body-cell-acciones="props">
              <q-td :props="props" class="text-center">
                <q-btn flat round icon="edit" color="primary" size="sm" @click="abrirDialogSucursal(props.row)">
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn flat round icon="delete" color="negative" size="sm" @click="confirmarEliminarSucursal(props.row)">
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- USUARIOS -->
      <q-tab-panel name="usuarios" class="q-pa-none">
        <q-card bordered>
          <q-card-section class="row items-center">
            <div class="text-h6">Usuarios del sistema</div>
            <q-space />
            <q-btn color="primary" icon="person_add" label="Agregar usuario" unelevated @click="abrirDialogUsuario()" />
          </q-card-section>
          <q-separator />
          <q-table :rows="usuarios" :columns="colsUsuarios" row-key="id" flat :loading="cargando"
            no-data-label="No hay usuarios registrados">
            <template #body-cell-rol="props">
              <q-td :props="props" class="text-center">
                <q-badge :color="getRolColor(props.value)" style="font-size: 11px">{{ getRolLabel(props.value) }}</q-badge>
              </q-td>
            </template>
            <template #body-cell-sucursal="props">
              <q-td :props="props">{{ props.row.sucursales?.nombre || '—' }}</q-td>
            </template>
            <template #body-cell-acciones="props">
              <q-td :props="props" class="text-center">
                <q-btn flat round icon="edit" color="primary" size="sm" @click="abrirDialogUsuario(props.row)">
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- CATÁLOGOS -->
      <q-tab-panel name="catalogos" class="q-pa-none">
        <q-card bordered>
          <q-card-section class="row items-center">
            <div>
              <div class="text-h6">Catálogos del sistema</div>
              <div class="text-caption text-grey-6">Administra las opciones de los formularios</div>
            </div>
            <q-space />
            <q-select
              v-model="catalogoActivo"
              outlined dense
              label="Catálogo"
              :options="tiposCatalogo"
              emit-value map-options
              style="min-width: 220px"
              @update:model-value="cargarCatalogo"
            />
            <q-btn color="primary" icon="add" label="Agregar" unelevated class="q-ml-md"
              @click="abrirDialogCatalogo()" :disable="!catalogoActivo" />
          </q-card-section>
          <q-separator />
          <q-table
            :rows="itemsCatalogo"
            :columns="colsCatalogo"
            row-key="id"
            flat
            :loading="cargandoCatalogo"
            no-data-label="Selecciona un catálogo para ver sus opciones"
          >
            <template #body-cell-activo="props">
              <q-td :props="props" class="text-center">
                <q-badge :color="props.value ? 'positive' : 'grey'">
                  {{ props.value ? 'Activo' : 'Inactivo' }}
                </q-badge>
              </q-td>
            </template>
            <template #body-cell-acciones="props">
              <q-td :props="props" class="text-center">
                <q-btn flat round icon="edit" color="primary" size="sm" @click="abrirDialogCatalogo(props.row)">
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn flat round icon="delete" color="negative" size="sm" @click="eliminarCatalogo(props.row)">
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

    </q-tab-panels>

    <!-- DIALOG CATÁLOGO -->
    <q-dialog v-model="dialogCatalogo" persistent>
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">{{ editCatalogo.id ? 'Editar opción' : 'Nueva opción' }}</div>
          <div class="text-caption text-grey-6">{{ tiposCatalogo.find(t => t.value === catalogoActivo)?.label }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editCatalogo.label" outlined label="Etiqueta (lo que ve el usuario) *"
            :rules="[val => !!val || 'Requerido']" />
          <q-input v-model="editCatalogo.value" outlined label="Valor interno *"
            hint="Sin espacios ni acentos. Ej: impresora_ticket"
            :rules="[val => !!val || 'Requerido']" />
          <q-input v-model="editCatalogo.grupo" outlined label="Grupo / Sección"
            hint="Para agrupar opciones en el selector. Ej: Impresoras" />
          <q-input v-model.number="editCatalogo.orden" outlined label="Orden" type="number" />
          <q-toggle v-model="editCatalogo.activo" label="Activo (visible en formularios)" color="primary" />
        </q-card-section>
        <q-card-actions align="right" class="q-pt-none">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" unelevated :loading="guardando" @click="guardarCatalogo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG SUCURSAL -->
    <q-dialog v-model="dialogSucursal" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">{{ editSucursal.id ? 'Editar sucursal' : 'Nueva sucursal' }}</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="editSucursal.nombre" outlined label="Nombre de la sucursal *" autofocus
            :rules="[val => !!val || 'El nombre es requerido']" />
        </q-card-section>
        <q-card-actions align="right" class="q-pt-none">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" unelevated :loading="guardando" @click="guardarSucursal" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG USUARIO -->
    <q-dialog v-model="dialogUsuario" persistent>
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">{{ editUsuario.id ? 'Editar usuario' : 'Nuevo usuario' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editUsuario.nombre" outlined label="Nombre completo *"
            :rules="[val => !!val || 'Requerido']" />
          <q-input v-model="editUsuario.email" outlined label="Correo electrónico *" type="email"
            :disable="!!editUsuario.id" :hint="editUsuario.id ? 'El correo no se puede modificar' : ''"
            :rules="[val => !!val || 'Requerido']" />
          <q-input v-if="!editUsuario.id" v-model="editUsuario.password" outlined label="Contraseña *" type="password"
            :rules="[val => !!val || 'Requerido', val => val.length >= 6 || 'Mínimo 6 caracteres']" />
          <q-select v-model="editUsuario.rol" outlined label="Rol *"
            :options="rolesOptions" emit-value map-options
            :rules="[val => !!val || 'Selecciona un rol']" />
          <q-select v-model="editUsuario.sucursal_id" outlined label="Sucursal"
            :options="sucursalesOptions" emit-value map-options clearable
            hint="Solo aplica para el rol Encargada" />
        </q-card-section>
        <q-card-actions align="right" class="q-pt-none">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" unelevated :loading="guardando" @click="guardarUsuario" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../lib/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const tab = ref('sucursales')
const sucursales = ref([])
const usuarios = ref([])
const cargando = ref(false)
const guardando = ref(false)

const dialogSucursal = ref(false)
const editSucursal = ref({ nombre: '' })
const dialogUsuario = ref(false)
const editUsuario = ref({ nombre: '', email: '', password: '', rol: null, sucursal_id: null })

// --- CATÁLOGOS ---
const catalogoActivo = ref(null)
const itemsCatalogo = ref([])
const cargandoCatalogo = ref(false)
const dialogCatalogo = ref(false)
const editCatalogo = ref({ label: '', value: '', grupo: '', orden: 0, activo: true })

const tiposCatalogo = [
  { label: 'Tipos de documento',    value: 'tipos_documento' },
  { label: 'Tipos de falla equipo', value: 'tipos_falla_equipo' }
]

const colsCatalogo = [
  { name: 'label',    label: 'Etiqueta',  field: 'label',  align: 'left', sortable: true },
  { name: 'value',    label: 'Valor',     field: 'value',  align: 'left' },
  { name: 'grupo',    label: 'Grupo',     field: 'grupo',  align: 'left' },
  { name: 'orden',    label: 'Orden',     field: 'orden',  align: 'center', sortable: true },
  { name: 'activo',   label: 'Estado',    field: 'activo', align: 'center' },
  { name: 'acciones', label: 'Acciones',  field: 'id',     align: 'center' }
]

async function cargarCatalogo() {
  if (!catalogoActivo.value) { itemsCatalogo.value = []; return }
  cargandoCatalogo.value = true
  try {
    const { data } = await api.get(`/catalogos/all?tipo=${catalogoActivo.value}`)
    itemsCatalogo.value = data || []
  } finally {
    cargandoCatalogo.value = false
  }
}

function abrirDialogCatalogo(item = null) {
  editCatalogo.value = item
    ? { ...item }
    : { label: '', value: '', grupo: '', orden: 0, activo: true }
  dialogCatalogo.value = true
}

async function guardarCatalogo() {
  if (!editCatalogo.value.label?.trim() || !editCatalogo.value.value?.trim()) {
    $q.notify({ type: 'warning', message: 'Etiqueta y valor son requeridos' })
    return
  }
  guardando.value = true
  try {
    if (editCatalogo.value.id) {
      await api.put(`/catalogos/${editCatalogo.value.id}`, {
        label:  editCatalogo.value.label.trim(),
        value:  editCatalogo.value.value.trim(),
        grupo:  editCatalogo.value.grupo || '',
        orden:  editCatalogo.value.orden ?? 0,
        activo: editCatalogo.value.activo
      })
    } else {
      await api.post('/catalogos', {
        tipo:   catalogoActivo.value,
        label:  editCatalogo.value.label.trim(),
        value:  editCatalogo.value.value.trim(),
        grupo:  editCatalogo.value.grupo || '',
        orden:  editCatalogo.value.orden ?? 0,
        activo: editCatalogo.value.activo
      })
    }
    await cargarCatalogo()
    dialogCatalogo.value = false
    $q.notify({ type: 'positive', message: 'Opción guardada correctamente' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + (e.response?.data?.error || e.message) })
  } finally {
    guardando.value = false
  }
}

async function eliminarCatalogo(item) {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Eliminar la opción "<b>${item.label}</b>"?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true }
  }).onOk(async () => {
    await api.delete(`/catalogos/${item.id}`)
    await cargarCatalogo()
    $q.notify({ type: 'positive', message: 'Opción eliminada' })
  })
}

const rolesOptions = [
  { label: 'Encargada de Sucursal', value: 'encargada' },
  { label: 'Soporte Técnico',       value: 'soporte' },
  { label: 'Administrador',         value: 'admin' }
]
const sucursalesOptions = computed(() => sucursales.value.map(s => ({ label: s.nombre, value: s.id })))

const colsSucursales = [
  { name: 'nombre',     label: 'Nombre',  field: 'nombre',     align: 'left', sortable: true },
  { name: 'created_at', label: 'Creada',  field: 'created_at', align: 'left' },
  { name: 'acciones',   label: 'Acciones',field: 'id',         align: 'center' }
]
const colsUsuarios = [
  { name: 'nombre',   label: 'Nombre',   field: 'nombre',  align: 'left', sortable: true },
  { name: 'email',    label: 'Correo',   field: 'email',   align: 'left' },
  { name: 'rol',      label: 'Rol',      field: 'rol',     align: 'center' },
  { name: 'sucursal', label: 'Sucursal', field: 'sucursal',align: 'left' },
  { name: 'acciones', label: 'Acciones', field: 'id',      align: 'center' }
]

onMounted(async () => {
  cargando.value = true
  await Promise.all([loadSucursales(), loadUsuarios()])
  cargando.value = false
})

async function loadSucursales() {
  const { data } = await api.get('/sucursales')
  sucursales.value = data || []
}
async function loadUsuarios() {
  const { data } = await api.get('/usuarios')
  usuarios.value = data || []
}

function abrirDialogSucursal(suc = null) {
  editSucursal.value = suc ? { ...suc } : { nombre: '' }
  dialogSucursal.value = true
}
async function guardarSucursal() {
  if (!editSucursal.value.nombre.trim()) return
  guardando.value = true
  try {
    if (editSucursal.value.id) {
      await api.put(`/sucursales/${editSucursal.value.id}`, { nombre: editSucursal.value.nombre.trim() })
    } else {
      await api.post('/sucursales', { nombre: editSucursal.value.nombre.trim() })
    }
    await loadSucursales()
    dialogSucursal.value = false
    $q.notify({ type: 'positive', message: 'Sucursal guardada correctamente' })
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar la sucursal' })
  } finally {
    guardando.value = false
  }
}
function confirmarEliminarSucursal(suc) {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Eliminar la sucursal "<b>${suc.nombre}</b>"?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true }
  }).onOk(async () => {
    await api.delete(`/sucursales/${suc.id}`)
    await loadSucursales()
    $q.notify({ type: 'positive', message: 'Sucursal eliminada' })
  })
}

function abrirDialogUsuario(usr = null) {
  editUsuario.value = usr
    ? { id: usr.id, nombre: usr.nombre, email: usr.email, rol: usr.rol, sucursal_id: usr.sucursal_id, password: '' }
    : { nombre: '', email: '', password: '', rol: null, sucursal_id: null }
  dialogUsuario.value = true
}
async function guardarUsuario() {
  guardando.value = true
  try {
    if (editUsuario.value.id) {
      await api.put(`/usuarios/${editUsuario.value.id}`, {
        nombre:      editUsuario.value.nombre,
        rol:         editUsuario.value.rol,
        sucursal_id: editUsuario.value.sucursal_id || null
      })
    } else {
      await api.post('/usuarios', { ...editUsuario.value })
    }
    await loadUsuarios()
    dialogUsuario.value = false
    $q.notify({ type: 'positive', message: 'Usuario guardado correctamente' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + (e.response?.data?.error || e.message || 'No se pudo guardar') })
  } finally {
    guardando.value = false
  }
}

function getRolColor(rol) { return { admin: 'negative', encargada: 'primary', soporte: 'positive' }[rol] || 'grey' }
function getRolLabel(rol)  { return { admin: 'Administrador', encargada: 'Encargada', soporte: 'Soporte Técnico' }[rol] || rol }
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
</style>
