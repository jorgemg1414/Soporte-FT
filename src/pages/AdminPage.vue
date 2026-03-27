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
      <q-tab name="sucursales"  icon="store"    label="Sucursales" />
      <q-tab name="usuarios"    icon="people"   label="Usuarios" />
      <q-tab name="catalogos"   icon="category" label="Catálogos" />
      <q-tab name="contrasenas" icon="lock"     label="Contraseñas" />
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
            <template #body-cell-email="props">
              <q-td :props="props">
                <span v-if="props.value" class="text-caption text-primary">
                  <q-icon name="email" size="14px" class="q-mr-xs" />{{ props.value }}
                </span>
                <span v-else class="text-caption text-grey-5">Sin correo</span>
              </q-td>
            </template>
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
                <q-btn flat round icon="delete" color="negative" size="sm" @click="confirmarEliminarUsuario(props.row)">
                  <q-tooltip>Eliminar</q-tooltip>
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

      <!-- CONTRASEÑAS -->
      <q-tab-panel name="contrasenas" class="q-pa-none">
        <q-card bordered>
          <q-card-section>
            <div class="text-h6">Cambiar contraseña de sucursales</div>
            <div class="text-caption text-grey-6 q-mb-md">Cambia la contraseña de una sucursal o de todas a la vez</div>

            <div class="row q-col-gutter-md">
              <!-- Cambiar una -->
              <div class="col-12 col-md-6">
                <q-card flat bordered class="q-pa-md">
                  <div class="text-subtitle1 text-weight-medium q-mb-md">Contraseña individual</div>
                  <q-select v-model="pwSucursalId" outlined dense label="Sucursal"
                    :options="sucursalesOptions" emit-value map-options class="q-mb-sm" />
                  <q-input v-model="pwIndividual" outlined dense label="Nueva contraseña"
                    :type="showPw ? 'text' : 'password'" class="q-mb-sm">
                    <template #append>
                      <q-icon :name="showPw ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPw = !showPw" />
                    </template>
                  </q-input>
                  <q-btn color="primary" label="Cambiar" unelevated :loading="guardandoPw"
                    :disable="!pwSucursalId || !pwIndividual" @click="cambiarPwIndividual" />
                </q-card>
              </div>
              <!-- Cambiar todas -->
              <div class="col-12 col-md-6">
                <q-card flat bordered class="q-pa-md">
                  <div class="text-subtitle1 text-weight-medium q-mb-md">Contraseña para TODAS</div>
                  <q-input v-model="pwTodas" outlined dense label="Nueva contraseña para todas"
                    :type="showPwAll ? 'text' : 'password'" class="q-mb-sm">
                    <template #append>
                      <q-icon :name="showPwAll ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPwAll = !showPwAll" />
                    </template>
                  </q-input>
                  <q-btn color="negative" label="Cambiar en TODAS" unelevated :loading="guardandoPw"
                    :disable="!pwTodas" @click="cambiarPwTodas" />
                </q-card>
              </div>
            </div>

            <q-separator class="q-my-lg" />

            <div class="text-subtitle1 text-weight-medium q-mb-sm">Cerrar sesiones</div>
            <q-btn color="warning" text-color="dark" icon="logout" label="Cerrar sesiones de TODAS las sucursales"
              unelevated :loading="cerrandoSesiones" @click="cerrarSesionesSucursales" />
          </q-card-section>
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
      <q-card style="min-width: 380px">
        <q-card-section>
          <div class="text-h6">{{ editSucursal.id ? 'Editar sucursal' : 'Nueva sucursal' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editSucursal.nombre" outlined label="Nombre de la sucursal *" autofocus
            :rules="[val => !!val || 'El nombre es requerido']" />
          <q-input v-model="editSucursal.email" outlined label="Correo de notificaciones"
            type="email" hint="Se enviará un aviso cuando cambie el estado del ticket"
            :rules="[val => !val || /.+@.+\..+/.test(val) || 'Correo inválido']">
            <template #prepend><q-icon name="email" /></template>
          </q-input>
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
          <q-input v-model="editUsuario.username" outlined label="Usuario (para iniciar sesión) *"
            :disable="!!editUsuario.id"
            :hint="editUsuario.id ? 'El usuario no se puede modificar' : `Iniciará sesión como: ${editUsuario.username || 'usuario'}@ft.com`"
            :rules="[val => !!val || 'Requerido', val => /^[a-z0-9]+$/.test(val) || 'Solo letras minúsculas y números, sin espacios']"
            @update:model-value="v => editUsuario.username = v.toLowerCase().replace(/[^a-z0-9]/g, '')" />
          <q-input v-if="!editUsuario.id" v-model="editUsuario.password" outlined label="Contraseña *" type="password"
            :rules="[val => !!val || 'Requerido', val => val.length >= 6 || 'Mínimo 6 caracteres']" />
          <q-select v-model="editUsuario.rol" outlined label="Rol *"
            :options="rolesOptions" emit-value map-options
            :rules="[val => !!val || 'Selecciona un rol']" />
          <q-select v-model="editUsuario.sucursal_id" outlined label="Sucursal"
            :options="sucursalesOptions" emit-value map-options clearable
            hint="Solo aplica para el rol Encargado/a de Sucursal" />
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

// --- CONTRASEÑAS ---
const pwSucursalId = ref(null)
const pwIndividual = ref('')
const pwTodas = ref('')
const showPw = ref(false)
const showPwAll = ref(false)
const guardandoPw = ref(false)
const cerrandoSesiones = ref(false)
const dialogUsuario = ref(false)
const editUsuario = ref({ nombre: '', username: '', password: '', rol: null, sucursal_id: null })

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
  { label: 'Soporte Técnico', value: 'soporte' },
  { label: 'Administrador',   value: 'admin' }
]
const sucursalesOptions = computed(() => sucursales.value.map(s => ({ label: s.nombre, value: s.id })))

const colsSucursales = [
  { name: 'nombre',     label: 'Nombre',  field: 'nombre',     align: 'left', sortable: true },
  { name: 'email',      label: 'Correo',  field: 'email',      align: 'left' },
  { name: 'created_at', label: 'Creada',  field: 'created_at', align: 'left' },
  { name: 'acciones',   label: 'Acciones',field: 'id',         align: 'center' }
]
const colsUsuarios = [
  { name: 'nombre',   label: 'Nombre',   field: 'nombre', align: 'left', sortable: true },
  { name: 'email',    label: 'Usuario',  field: 'email',  align: 'left' },
  { name: 'rol',      label: 'Rol',      field: 'rol',    align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'id',     align: 'center' }
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
    const payload = { nombre: editSucursal.value.nombre.trim(), email: editSucursal.value.email?.trim() || '' }
    if (editSucursal.value.id) {
      await api.put(`/sucursales/${editSucursal.value.id}`, payload)
    } else {
      await api.post('/sucursales', payload)
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

function confirmarEliminarUsuario(usr) {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Eliminar al usuario "<b>${usr.nombre}</b>"? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      await api.delete(`/usuarios/${usr.id}`)
      await loadUsuarios()
      $q.notify({ type: 'positive', message: 'Usuario eliminado' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al eliminar: ' + (e.response?.data?.error || e.message) })
    }
  })
}

function abrirDialogUsuario(usr = null) {
  editUsuario.value = usr
    ? { id: usr.id, nombre: usr.nombre, username: usr.email?.replace('@ft.com', ''), rol: usr.rol, sucursal_id: usr.sucursal_id, password: '' }
    : { nombre: '', username: '', password: '', rol: null, sucursal_id: null }
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
      const email = editUsuario.value.username.trim().toLowerCase() + '@ft.com'
      await api.post('/usuarios', {
        nombre:      editUsuario.value.nombre,
        email,
        password:    editUsuario.value.password,
        rol:         editUsuario.value.rol,
        sucursal_id: editUsuario.value.sucursal_id || null
      })
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

async function cambiarPwIndividual() {
  if (!pwSucursalId.value || !pwIndividual.value) return
  guardandoPw.value = true
  try {
    await api.put(`/sucursales/${pwSucursalId.value}/password`, { password: pwIndividual.value })
    $q.notify({ type: 'positive', message: 'Contraseña actualizada' })
    pwIndividual.value = ''
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error al cambiar contraseña' })
  } finally {
    guardandoPw.value = false
  }
}

async function cambiarPwTodas() {
  if (!pwTodas.value) return
  $q.dialog({
    title: 'Confirmar cambio',
    message: 'Esto cambiará la contraseña de TODAS las sucursales. ¿Continuar?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Cambiar todas', color: 'negative', unelevated: true }
  }).onOk(async () => {
    guardandoPw.value = true
    try {
      await api.put('/sucursales/password-todas', { password: pwTodas.value })
      $q.notify({ type: 'positive', message: 'Contraseñas actualizadas en todas las sucursales' })
      pwTodas.value = ''
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error al cambiar contraseñas' })
    } finally {
      guardandoPw.value = false
    }
  })
}

async function cerrarSesionesSucursales() {
  $q.dialog({
    title: 'Confirmar cierre',
    message: 'Esto cerrará la sesión de TODAS las sucursales conectadas.',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Cerrar sesiones', color: 'warning', textColor: 'dark', unelevated: true }
  }).onOk(async () => {
    cerrandoSesiones.value = true
    try {
      await api.post('/auth/cerrar-sesiones-sucursales')
      $q.notify({ type: 'positive', message: 'Sesiones cerradas correctamente' })
    } catch {
      $q.notify({ type: 'negative', message: 'Error al cerrar sesiones' })
    } finally {
      cerrandoSesiones.value = false
    }
  })
}

function getRolColor(rol) { return { admin: 'negative', encargada: 'primary', soporte: 'positive' }[rol] || 'grey' }
function getRolLabel(rol)  { return { admin: 'Administrador', encargada: 'Encargado/a', soporte: 'Soporte Técnico' }[rol] || rol }
</script>

<style scoped>
.welcome-banner {
  background: linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
</style>
