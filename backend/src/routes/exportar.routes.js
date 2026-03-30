import { Router } from 'express'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import db from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('soporte', 'admin'))

const estadoLabels = {
  abierto: 'Abierto', en_proceso: 'En Proceso',
  resuelto: 'Resuelto', cerrado: 'Cerrado'
}

const categoriaLabels = {
  cancelacion_documento: 'Cancelación de documento',
  falla_pvwin: 'Falla PVWIN',
  falla_computadora: 'Falla de computadora',
  otro: 'Otro'
}

function getTicketsData() {
  const tickets = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all()
  return tickets.map(t => {
    const suc = t.sucursal_id ? db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(t.sucursal_id) : null
    const tecnico = t.asignado_a ? db.prepare('SELECT nombre FROM profiles WHERE id = ?').get(t.asignado_a) : null
    return {
      folio: t.folio,
      titulo: t.titulo,
      categoria: categoriaLabels[t.categoria] || t.categoria,
      estado: estadoLabels[t.estado] || t.estado,
      sucursal: suc?.nombre || '—',
      urgente: t.urgente ? 'Sí' : 'No',
      asignado_a: tecnico?.nombre || '—',
      created_at: t.created_at?.slice(0, 10) || '',
      updated_at: t.updated_at?.slice(0, 10) || ''
    }
  })
}

const columns = [
  { header: 'Folio', key: 'folio', width: 14 },
  { header: 'Título', key: 'titulo', width: 35 },
  { header: 'Categoría', key: 'categoria', width: 25 },
  { header: 'Estado', key: 'estado', width: 14 },
  { header: 'Sucursal', key: 'sucursal', width: 18 },
  { header: 'Urgente', key: 'urgente', width: 10 },
  { header: 'Asignado a', key: 'asignado_a', width: 18 },
  { header: 'Creado', key: 'created_at', width: 12 },
  { header: 'Actualizado', key: 'updated_at', width: 12 }
]

// ─── GET /api/exportar/excel ──────────────────────────────────────────────────
router.get('/excel', (req, res) => {
  try {
    const tickets = getTicketsData()
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Centro de Soporte'
    const sheet = workbook.addWorksheet('Tickets')
    sheet.columns = columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
    tickets.forEach(t => sheet.addRow(t))

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=tickets_${new Date().toISOString().slice(0,10)}.xlsx`)
    workbook.xlsx.write(res).then(() => res.end())

  } catch (err) {
    console.error('Error exportExcel:', err)
    res.status(500).json({ error: 'Error al exportar Excel' })
  }
})

// ─── GET /api/exportar/pdf ────────────────────────────────────────────────────
router.get('/pdf', (req, res) => {
  try {
    const tickets = getTicketsData()
    const doc = new PDFDocument({ margin: 30, size: 'LETTER', layout: 'landscape' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=tickets_${new Date().toISOString().slice(0,10)}.pdf`)
    doc.pipe(res)

    doc.fontSize(16).font('Helvetica-Bold').text('Reporte de Tickets - Centro de Soporte', { align: 'center' })
    doc.fontSize(10).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-MX')}`, { align: 'center' })
    doc.moveDown()

    const colWidths = [65, 180, 120, 70, 90, 50, 90, 65, 65]
    const headers = columns.map(c => c.header)
    const startX = 30
    let y = doc.y

    doc.font('Helvetica-Bold').fontSize(8)
    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.text(h, x, y, { width: colWidths[i], align: 'left' })
    })

    y += 15
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke()
    y += 5

    doc.font('Helvetica').fontSize(7)
    for (const t of tickets) {
      if (y > 560) { doc.addPage(); y = 30 }
      const vals = [t.folio, t.titulo, t.categoria, t.estado, t.sucursal, t.urgente, t.asignado_a, t.created_at, t.updated_at]
      vals.forEach((v, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.text(String(v || ''), x, y, { width: colWidths[i], align: 'left' })
      })
      y += 13
    }

    doc.end()

  } catch (err) {
    console.error('Error exportPDF:', err)
    if (!res.headersSent) res.status(500).json({ error: 'Error al exportar PDF' })
  }
})

export default router
