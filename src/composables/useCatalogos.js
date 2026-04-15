import { ref } from 'vue'
import api from '../lib/api'

export function useCatalogos() {
  const tiposDocumento = ref([])
  const tiposFallaEquipo = ref([])
  const tiposCancelacionPortal = ref([])
  const cargado = ref(false)

  async function cargarCatalogos() {
    try {
      const [resDoc, resFalla, resPortal] = await Promise.all([
        api.get('/catalogos?tipo=tipos_documento'),
        api.get('/catalogos?tipo=tipos_falla_equipo'),
        api.get('/catalogos?tipo=tipos_cancelacion_portal')
      ])

      tiposDocumento.value = (resDoc.data || []).map(c => ({ label: c.label, value: c.value }))
      tiposCancelacionPortal.value = (resPortal.data || []).map(c => ({ label: c.label, value: c.value }))

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
      cargado.value = true
    } catch {
      /* silencioso */
    }
  }

  return { tiposDocumento, tiposFallaEquipo, tiposCancelacionPortal, cargado, cargarCatalogos }
}
