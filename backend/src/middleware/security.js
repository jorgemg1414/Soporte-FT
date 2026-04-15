import db, { genId } from '../lib/database.js'

// ─── Bloqueo progresivo por IP ────────────────────────────────────────────────
const failedAttempts = new Map() // IP → { count, blockedUntil }

const IP_BLOCK_THRESHOLDS = [
  { attempts:  5, blockMinutes:   2 },
  { attempts: 10, blockMinutes:  15 },
  { attempts: 20, blockMinutes:  60 },
  { attempts: 40, blockMinutes: 240 },
]

// ─── Bloqueo progresivo por cuenta (email / sucursal_id) ─────────────────────
const accountAttempts = new Map() // identifier → { count, blockedUntil }

const ACCOUNT_BLOCK_THRESHOLDS = [
  { attempts: 10, blockMinutes:   5 },
  { attempts: 20, blockMinutes:  30 },
  { attempts: 30, blockMinutes: 120 },
]

// req.ip es correcto cuando app.set('trust proxy', 1) está configurado en Express.
// NO leer x-forwarded-for directamente: un cliente puede falsificarlo.
function getClientIP(req) {
  return req.ip || 'unknown'
}

// ─── Log de seguridad (consola + BD) ─────────────────────────────────────────
export function logSecurity(event, details) {
  const timestamp = new Date().toISOString()
  console.warn(`[SECURITY ${timestamp}] ${event}: ${JSON.stringify(details)}`)
  try {
    db.prepare('INSERT INTO security_logs (id, event, details, ip, created_at) VALUES (?,?,?,?,?)')
      .run(genId(), event, JSON.stringify(details), details?.ip || null, timestamp)
  } catch { /* no crashear si la tabla aún no existe en primera corrida */ }
}

// ─── IP: check + register ─────────────────────────────────────────────────────
export function checkIPBlock(req, res, next) {
  const ip = getClientIP(req)
  const record = failedAttempts.get(ip)

  if (record?.blockedUntil && Date.now() < record.blockedUntil) {
    const remainingSec = Math.ceil((record.blockedUntil - Date.now()) / 1000)
    logSecurity('BLOCKED_IP_ATTEMPT', { ip, remainingSec, totalFails: record.count })
    return res.status(429).json({
      error: `IP bloqueada temporalmente. Intenta en ${remainingSec} segundos.`
    })
  }
  next()
}

export function registerFailedAttempt(req) {
  const ip = getClientIP(req)
  const record = failedAttempts.get(ip) || { count: 0, blockedUntil: null }
  record.count++

  for (let i = IP_BLOCK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (record.count >= IP_BLOCK_THRESHOLDS[i].attempts) {
      record.blockedUntil = Date.now() + IP_BLOCK_THRESHOLDS[i].blockMinutes * 60 * 1000
      break
    }
  }
  failedAttempts.set(ip, record)

  logSecurity('LOGIN_FAILED', {
    ip,
    attempt: record.count,
    blocked: !!record.blockedUntil,
    identifier: req.body?.email || req.body?.sucursal_id || 'unknown'
  })
}

export function registerSuccessfulLogin(req, userInfo) {
  const ip = getClientIP(req)
  failedAttempts.delete(ip)
  logSecurity('LOGIN_SUCCESS', { ip, userId: userInfo.id, nombre: userInfo.nombre, rol: userInfo.rol })
}

// ─── Cuenta: check + register ─────────────────────────────────────────────────
export function checkAccountBlock(identifier) {
  const record = accountAttempts.get(identifier)
  if (record?.blockedUntil && Date.now() < record.blockedUntil) {
    return Math.ceil((record.blockedUntil - Date.now()) / 1000)
  }
  return null
}

export function registerAccountFailure(identifier) {
  const record = accountAttempts.get(identifier) || { count: 0, blockedUntil: null }
  record.count++

  for (let i = ACCOUNT_BLOCK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (record.count >= ACCOUNT_BLOCK_THRESHOLDS[i].attempts) {
      record.blockedUntil = Date.now() + ACCOUNT_BLOCK_THRESHOLDS[i].blockMinutes * 60 * 1000
      break
    }
  }
  accountAttempts.set(identifier, record)
}

export function clearAccountBlock(identifier) {
  accountAttempts.delete(identifier)
}

// ─── Admin: limpiar todos los bloqueos IP ────────────────────────────────────
export function clearAllBlocks() {
  const count = failedAttempts.size
  failedAttempts.clear()
  return count
}

// ─── Limpieza periódica de mapas en memoria (cada 30 min) ────────────────────
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of failedAttempts) {
    if (!record.blockedUntil || now > record.blockedUntil + 3600000) {
      failedAttempts.delete(ip)
    }
  }
  for (const [key, record] of accountAttempts) {
    if (!record.blockedUntil || now > record.blockedUntil + 3600000) {
      accountAttempts.delete(key)
    }
  }
}, 30 * 60 * 1000)
