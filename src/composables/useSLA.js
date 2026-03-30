// Umbrales de SLA en horas
export const SLA_WARN_HOURS = 4
export const SLA_CRIT_HOURS = 8

export function useSLA() {
  function horasAbiertas(ticket) {
    const end = ticket.resuelto_at ? new Date(ticket.resuelto_at) : new Date()
    return (end - new Date(ticket.created_at)) / 3600000
  }

  function slaStatus(ticket) {
    if (ticket.estado === 'cerrado') return 'closed'
    if (ticket.estado === 'resuelto') return 'resolved'
    const h = horasAbiertas(ticket)
    if (h >= SLA_CRIT_HOURS) return 'critical'
    if (h >= SLA_WARN_HOURS) return 'warn'
    return 'ok'
  }

  function slaLabel(ticket) {
    const h = horasAbiertas(ticket)
    if (h < 1) return '<1h'
    if (h < 24) return `${Math.floor(h)}h`
    return `${Math.floor(h / 24)}d`
  }

  function slaBadgeColor(ticket) {
    return { critical: 'negative', warn: 'warning', ok: 'grey-5', resolved: 'positive', closed: 'grey-6' }[slaStatus(ticket)]
  }

  function slaIcon(ticket) {
    return { critical: 'error', warn: 'warning', ok: 'schedule', resolved: 'check_circle', closed: 'lock' }[slaStatus(ticket)]
  }

  function violaSLA(ticket) {
    return ['critical', 'warn'].includes(slaStatus(ticket))
  }

  return { slaStatus, slaLabel, slaBadgeColor, slaIcon, violaSLA, horasAbiertas }
}
