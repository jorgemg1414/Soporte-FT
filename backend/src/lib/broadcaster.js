// Broadcaster SSE — mantiene las conexiones abiertas y empuja eventos a todos los clientes conectados

const clients = new Set()

export function addClient(res) {
  clients.add(res)
}

export function removeClient(res) {
  clients.delete(res)
}

/**
 * Envía un evento SSE a todos los clientes conectados.
 * @param {string} event  Nombre del evento (ej. 'ticket_nuevo')
 * @param {object} data   Payload JSON
 */
export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      client.write(msg)
    } catch {
      clients.delete(client)
    }
  }
}

export function clientCount() {
  return clients.size
}
