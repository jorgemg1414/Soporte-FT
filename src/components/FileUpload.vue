<template>
  <div>
    <!-- Drop zone -->
    <div class="drop-zone q-pa-md text-center cursor-pointer"
      :class="{ 'drop-zone--active': isDragging }"
      @click="inputFiles?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop">
      <input ref="inputFiles" type="file" :accept="accept" multiple
        style="display:none" @change="onSelect" />
      <q-icon name="cloud_upload" size="32px" color="grey-5" class="q-mb-xs" />
      <div class="text-caption text-grey-6">
        Arrastra archivos aquí o <span class="text-primary">haz clic</span>
      </div>
      <div class="text-caption text-grey-4 q-mt-xs">
        Imágenes, PDF, Word, Excel — máx {{ maxFiles }} archivos, 10MB cada uno
      </div>
    </div>

    <!-- Lista de archivos -->
    <div v-if="files.length > 0" class="q-mt-sm q-gutter-xs">
      <div v-for="(f, i) in files" :key="i" class="row items-center q-pa-xs file-item">
        <q-icon :name="getFileIcon(f)" :color="getFileColor(f)" size="20px" class="q-mr-sm" />
        <div class="col ellipsis">
          <div class="text-body2">{{ f.name }}</div>
          <div class="text-caption text-grey-5">{{ formatSize(f.size) }}</div>
        </div>
        <!-- Preview imagen -->
        <q-img v-if="isImage(f) && previews[i]"
          :src="previews[i]" style="width: 40px; height: 40px; border-radius: 6px" fit="cover"
          class="q-mr-sm" />
        <q-btn flat round dense icon="close" color="grey-5" size="sm" @click="removeFile(i)">
          <q-tooltip>Quitar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Estado de subida -->
    <div v-if="uploading" class="q-mt-sm">
      <q-linear-progress :value="uploadProgress" color="primary" rounded />
      <div class="text-caption text-grey-6 q-mt-xs">Subiendo {{ files.length }} archivo(s)...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../lib/api'

const props = defineProps({
  accept: { type: String, default: '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv' },
  maxFiles: { type: Number, default: 5 },
  uploadUrl: { type: String, default: '' }
})

const emit = defineEmits(['uploaded', 'files-changed'])

const inputFiles = ref(null)
const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const files = ref([])
const previews = ref([])

function onSelect(e) {
  addFiles(Array.from(e.target.files))
  e.target.value = ''
}

function onDrop(e) {
  isDragging.value = false
  addFiles(Array.from(e.dataTransfer.files))
}

function addFiles(newFiles) {
  const remaining = props.maxFiles - files.value.length
  const toAdd = newFiles.slice(0, remaining)
  let rejected = 0

  for (const f of toAdd) {
    if (f.size > 10 * 1024 * 1024) { rejected++; continue }
    files.value.push(f)

    if (isImage(f)) {
      const reader = new FileReader()
      const idx = files.value.length - 1
      reader.onload = ev => { previews.value[idx] = ev.target.result }
      reader.readAsDataURL(f)
    }
  }
  emit('files-changed', files.value)

  if (rejected > 0) {
    emit('rejected', rejected)
  }
}

function removeFile(index) {
  files.value.splice(index, 1)
  previews.value.splice(index, 1)
  emit('files-changed', files.value)
}

function isImage(f) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)
}

function getFileIcon(f) {
  if (isImage(f)) return 'image'
  if (/\.pdf$/i.test(f.name)) return 'picture_as_pdf'
  if (/\.(doc|docx)$/i.test(f.name)) return 'description'
  if (/\.(xls|xlsx)$/i.test(f.name)) return 'table_chart'
  return 'attach_file'
}

function getFileColor(f) {
  if (isImage(f)) return 'positive'
  if (/\.pdf$/i.test(f.name)) return 'negative'
  return 'grey-6'
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function upload(ticketId) {
  if (files.value.length === 0) return []
  if (!props.uploadUrl) return []

  uploading.value = true
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    for (const f of files.value) {
      formData.append('files', f)
    }

    const url = props.uploadUrl.replace(':ticketId', ticketId)
    const { data } = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        uploadProgress.value = e.loaded / (e.total || 1)
      }
    })

    files.value = []
    previews.value = []
    emit('uploaded', data)
    return data
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

defineExpose({ upload, files })
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s;
}
.drop-zone:hover { border-color: #1976D2; }
.drop-zone--active { border-color: #1976D2; background: rgba(25, 118, 210, 0.05); }
.file-item {
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fafafa;
}
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
