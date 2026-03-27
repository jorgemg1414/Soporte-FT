import nodemailer from 'nodemailer'

// Si SMTP_USER no está configurado, las funciones sólo muestran un log y no fallan
function isConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

const estadoInfo = {
  en_proceso: { label: 'En Proceso',  color: '#1976D2', icon: '🔄', mensaje: 'Tu reporte ya está siendo atendido por el equipo de Sistemas.' },
  resuelto:   { label: 'Resuelto',    color: '#2E7D32', icon: '✅', mensaje: 'Tu reporte ha sido resuelto. Si el problema persiste puedes abrirlo nuevamente.' },
  cerrado:    { label: 'Cerrado',     color: '#616161', icon: '🔒', mensaje: 'Tu reporte ha sido cerrado.' },
  abierto:    { label: 'Reabierto',   color: '#F57C00', icon: '🔓', mensaje: 'Tu reporte ha sido reabierto y está pendiente de atención.' }
}

function plantillaEstado({ folio, titulo, sucursal, estado, tecnico, appUrl }) {
  const info = estadoInfo[estado] || { label: estado, color: '#1976D2', icon: '📋', mensaje: '' }
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1565C0,#1976D2);padding:28px 32px">
          <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff">Centro de Soporte FT</p>
          <p style="margin:6px 0 0;font-size:13px;color:#90CAF9">Actualización de reporte</p>
        </td></tr>

        <!-- Estado badge -->
        <tr><td style="padding:28px 32px 0">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:${info.color};border-radius:20px;padding:6px 16px">
              <span style="color:#ffffff;font-size:13px;font-weight:bold">${info.icon} ${info.label}</span>
            </td></tr>
          </table>
          <h2 style="margin:16px 0 6px;font-size:20px;color:#212121">${folio}</h2>
          <p style="margin:0;font-size:15px;color:#424242">${titulo}</p>
        </td></tr>

        <!-- Cuerpo -->
        <tr><td style="padding:20px 32px">
          <p style="margin:0 0 16px;font-size:15px;color:#424242;line-height:1.6">${info.mensaje}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;border-radius:8px;padding:16px">
            <tr>
              <td style="font-size:13px;color:#757575;padding:4px 0">Sucursal</td>
              <td style="font-size:13px;color:#212121;font-weight:bold;text-align:right">${sucursal}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#757575;padding:4px 0">Folio</td>
              <td style="font-size:13px;color:#1976D2;font-weight:bold;text-align:right">${folio}</td>
            </tr>
            ${tecnico ? `<tr>
              <td style="font-size:13px;color:#757575;padding:4px 0">Atendido por</td>
              <td style="font-size:13px;color:#212121;font-weight:bold;text-align:right">${tecnico}</td>
            </tr>` : ''}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px 28px">
          <p style="margin:0;font-size:12px;color:#9E9E9E;text-align:center">
            Este correo es generado automáticamente por el sistema Centro de Soporte FT.<br>
            Por favor no respondas a este mensaje.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function plantillaComentario({ folio, titulo, sucursal, comentario, tecnico }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">

        <tr><td style="background:linear-gradient(135deg,#1565C0,#1976D2);padding:28px 32px">
          <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff">Centro de Soporte FT</p>
          <p style="margin:6px 0 0;font-size:13px;color:#90CAF9">Nuevo comentario en tu reporte</p>
        </td></tr>

        <tr><td style="padding:28px 32px 0">
          <h2 style="margin:0 0 6px;font-size:20px;color:#212121">${folio}</h2>
          <p style="margin:0;font-size:15px;color:#424242">${titulo}</p>
        </td></tr>

        <tr><td style="padding:20px 32px">
          <p style="margin:0 0 12px;font-size:14px;color:#757575">
            <strong style="color:#1976D2">${tecnico}</strong> ha añadido un comentario:
          </p>
          <div style="background:#E3F2FD;border-left:4px solid #1976D2;border-radius:4px;padding:16px">
            <p style="margin:0;font-size:15px;color:#212121;line-height:1.6;white-space:pre-wrap">${comentario}</p>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 28px">
          <p style="margin:0;font-size:12px;color:#9E9E9E;text-align:center">
            Este correo es generado automáticamente por el sistema Centro de Soporte FT.<br>
            Por favor no respondas a este mensaje.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function notificarCambioEstado({ to, folio, titulo, sucursal, estado, tecnico }) {
  if (!isConfigured()) {
    console.log(`[Mailer] Sin configurar — omitiendo notificación (${estado}) para ${to || 'sin email'}`)
    return
  }
  if (!to) return

  const info = estadoInfo[estado]
  if (!info) return

  try {
    const transport = createTransport()
    await transport.sendMail({
      from:    `"Centro de Soporte FT" <${process.env.SMTP_USER}>`,
      to,
      subject: `${info.icon} Reporte ${folio} — ${info.label}`,
      html:    plantillaEstado({ folio, titulo, sucursal, estado, tecnico })
    })
    console.log(`[Mailer] Email enviado a ${to} — estado: ${estado}`)
  } catch (err) {
    console.error('[Mailer] Error al enviar email:', err.message)
  }
}

export async function notificarComentario({ to, folio, titulo, sucursal, comentario, tecnico }) {
  if (!isConfigured()) {
    console.log(`[Mailer] Sin configurar — omitiendo notificación (comentario) para ${to || 'sin email'}`)
    return
  }
  if (!to) return

  try {
    const transport = createTransport()
    await transport.sendMail({
      from:    `"Centro de Soporte FT" <${process.env.SMTP_USER}>`,
      to,
      subject: `💬 Nuevo comentario en reporte ${folio}`,
      html:    plantillaComentario({ folio, titulo, sucursal, comentario, tecnico })
    })
    console.log(`[Mailer] Email comentario enviado a ${to}`)
  } catch (err) {
    console.error('[Mailer] Error al enviar email comentario:', err.message)
  }
}
