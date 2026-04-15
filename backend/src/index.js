import 'dotenv/config'
import { app } from './app.js'
import db from './lib/database.js'
import { startBackupScheduler } from './lib/backup.js'

// Validar variables de entorno requeridas
const requiredEnv = [
  'JWT_SECRET',
  'MOCK_PASSWORD_SUCURSALES', 'MOCK_PASSWORD_ADMIN', 'MOCK_PASSWORD_SOPORTE', 'MOCK_PASSWORD_USUARIOS',
  'JWT_EXPIRES_SISTEMAS', 'JWT_EXPIRES_SUCURSAL', 'JWT_REFRESH_EXPIRES',
  'RATE_LIMIT_GENERAL', 'RATE_LIMIT_LOGIN', 'RATE_LIMIT_TICKETS'
]
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`ERROR: ${key} no está definido en .env`)
    process.exit(1)
  }
}

// JWT_SECRET debe tener mínimo 32 caracteres para HS256
if (process.env.JWT_SECRET.length < 32) {
  console.error('ERROR: JWT_SECRET debe tener al menos 32 caracteres. Genera uno seguro con: openssl rand -base64 48')
  process.exit(1)
}

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`)
  console.log('Base de datos: SQLite (better-sqlite3)')
  startBackupScheduler()
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} en uso. Intentando liberar...`)
    import('child_process').then(({ execSync }) => {
      try {
        execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' })
      } catch { /* ignore */ }
      setTimeout(() => {
        console.log(`Reintentando puerto ${PORT}...`)
        server.listen(PORT)
      }, 1000)
    })
  } else {
    console.error('Error del servidor:', err)
    process.exit(1)
  }
})

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor...`)
  server.close(() => {
    console.log('Servidor HTTP cerrado')
    db.close()
    console.log('Base de datos cerrada')
    process.exit(0)
  })
  // Forzar cierre si tarda más de 5 segundos
  setTimeout(() => {
    console.error('Timeout: forzando cierre')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
