// Bloqueo progresivo por IP para intentos fallidos de login
// y registro de eventos de seguridad

const failedAttempts = new Map() // IP → { count, blockedUntil }

const BLOCK_THRESHOLDS = [
  { attempts: 5,  blockMinutes: 1  },
  { attempts: 10, blockMinutes: 5  },
  { attempts: 20, blockMinutes: 15 },
  { attempts: 30, blockMinutes: 60 },
]

function getClientIP(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
}

export function logSecurity(event, details) {
  const timestamp = new Date().toISOString()
  const line = `[SECURITY ${timestamp}] ${event}: ${JSON.stringify(details)}`
  console.warn(line)
}

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

  // Buscar el bloqueo correspondiente
  for (let i = BLOCK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (record.count >= BLOCK_THRESHOLDS[i].attempts) {
      record.blockedUntil = Date.now() + BLOCK_THRESHOLDS[i].blockMinutes * 60 * 1000
      break
    }
  }

  failedAttempts.set(ip, record)

  logSecurity('LOGIN_FAILED', {
    ip,
    attempt: record.count,
    blocked: !!record.blockedUntil,
    email: req.body?.email || req.body?.sucursal_id || 'unknown'
  })
}

export function registerSuccessfulLogin(req, userInfo) {
  const ip = getClientIP(req)
  failedAttempts.delete(ip) // Limpiar intentos fallidos en login exitoso

  logSecurity('LOGIN_SUCCESS', {
    ip,
    userId: userInfo.id,
    nombre: userInfo.nombre,
    rol: userInfo.rol
  })
}

// Limpiar registros viejos cada 30 minutos para no acumular memoria
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of failedAttempts) {
    if (record.blockedUntil && now > record.blockedUntil + 3600000) {
      failedAttempts.delete(ip)
    }
  }
}, 30 * 60 * 1000)
