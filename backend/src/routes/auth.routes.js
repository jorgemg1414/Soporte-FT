import crypto from 'crypto'
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db, { genId, invalidateSucursalSessions } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  checkIPBlock, registerFailedAttempt, registerSuccessfulLogin, logSecurity, clearAllBlocks,
  checkAccountBlock, registerAccountFailure, clearAccountBlock
} from '../middleware/security.js'
import { logAudit } from '../lib/audit.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setTokenCookie(res, token, maxAge) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge
  })
}

function cleanupExpiredTokens() {
  try {
    db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(new Date().toISOString())
  } catch { /* ignorar */ }
}

function setRefreshCookie(res, token, maxAge) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/api/auth'
  })
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex')
}

function storeRefreshToken({ userId, rol, sucursalId, ip, userAgent, expiresMs }) {
  const raw = generateRefreshToken()
  const hash = hashToken(raw)
  const expiresAt = new Date(Date.now() + expiresMs).toISOString()
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, rol, sucursal_id, token_hash, ip, user_agent, expires_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(genId(), userId, rol, sucursalId || null, hash, ip || null, userAgent || null, expiresAt)
  return { raw, expiresAt }
}

const REFRESH_EXPIRES_SISTEMAS = 7 * 60 * 60 * 1000       // 7 horas
const REFRESH_EXPIRES_SUCURSAL  = 7 * 24 * 60 * 60 * 1000 // 7 días

function refreshExpiresMs(rol) {
  return rol === 'encargada' ? REFRESH_EXPIRES_SUCURSAL : REFRESH_EXPIRES_SISTEMAS
}

function revokeRefreshTokensForUser(userId) {
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId)
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', checkIPBlock, (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  // Bloqueo por cuenta
  const remainingSec = checkAccountBlock(email.toLowerCase())
  if (remainingSec !== null) {
    logSecurity('ACCOUNT_BLOCKED', { ip: req.ip, identifier: email, remainingSec })
    return res.status(429).json({ error: `Cuenta bloqueada temporalmente. Intenta en ${remainingSec} segundos.` })
  }

  try {
    const normalize = s => s.replace(/@ft\.com$/i, '').toLowerCase()
    const authUser = db.prepare(`
      SELECT * FROM users_auth WHERE LOWER(REPLACE(email, '@ft.com', '')) = ?
    `).get(normalize(email))

    if (!authUser || !bcrypt.compareSync(password, authUser.password)) {
      registerFailedAttempt(req)
      registerAccountFailure(email.toLowerCase())
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(authUser.id)
    if (!profile) {
      return res.status(401).json({ error: 'Perfil no encontrado' })
    }

    let sucursal = null
    if (profile.sucursal_id) {
      sucursal = db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(profile.sucursal_id)
    }

    const userId          = authUser.id
    const nombre          = profile.nombre
    const rol             = profile.rol
    const sucursal_id     = profile.sucursal_id || null
    const sucursal_nombre = sucursal?.nombre || null

    const payload = { sub: userId, nombre, rol, sucursal_id, sucursal_nombre }
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_SISTEMAS })
    const expiresMs   = refreshExpiresMs(rol)
    const { raw: refreshRaw, expiresAt: refreshExpiresAt } = storeRefreshToken({ userId, rol, sucursalId: sucursal_id, ip: req.ip, userAgent: req.headers['user-agent'], expiresMs })
    const cookieMaxAge = new Date(refreshExpiresAt) - Date.now()

    cleanupExpiredTokens()
    setTokenCookie(res, accessToken, cookieMaxAge)
    setRefreshCookie(res, refreshRaw, cookieMaxAge)

    clearAccountBlock(email.toLowerCase())
    registerSuccessfulLogin(req, { id: userId, nombre, rol })

    return res.json({ user: { id: userId, nombre, rol, sucursal_id, sucursal_nombre }, sessionExpiresAt: refreshExpiresAt })

  } catch (err) {
    console.error('Error en login:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/sucursal-login ───────────────────────────────────────────
router.post('/sucursal-login', checkIPBlock, (req, res) => {
  const { sucursal_id, password } = req.body
  if (!sucursal_id) return res.status(400).json({ error: 'Sucursal requerida' })
  if (!password)    return res.status(400).json({ error: 'Contraseña requerida' })

  // Bloqueo por cuenta
  const remainingSec = checkAccountBlock(`suc:${sucursal_id}`)
  if (remainingSec !== null) {
    logSecurity('ACCOUNT_BLOCKED', { ip: req.ip, identifier: sucursal_id, remainingSec })
    return res.status(429).json({ error: `Sucursal bloqueada temporalmente. Intenta en ${remainingSec} segundos.` })
  }

  try {
    const sucursal = db.prepare('SELECT * FROM sucursales WHERE id = ?').get(sucursal_id)
    if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' })

    if (!bcrypt.compareSync(password, sucursal.password)) {
      registerFailedAttempt(req)
      registerAccountFailure(`suc:${sucursal_id}`)
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    const sucursal_nombre = sucursal.nombre
    const profile = db.prepare("SELECT id FROM profiles WHERE sucursal_id = ? AND rol = 'encargada'").get(sucursal_id)
    const userId = profile?.id || `branch_${sucursal_id}`

    const payload = { sub: userId, nombre: sucursal_nombre, rol: 'encargada', sucursal_id, sucursal_nombre }
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_SUCURSAL })
    const { raw: refreshRaw, expiresAt: refreshExpiresAt } = storeRefreshToken({ userId, rol: 'encargada', sucursalId: sucursal_id, ip: req.ip, userAgent: req.headers['user-agent'], expiresMs: REFRESH_EXPIRES_SUCURSAL })
    const cookieMaxAge = new Date(refreshExpiresAt) - Date.now()

    cleanupExpiredTokens()
    db.prepare('UPDATE sucursales SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), sucursal_id)

    setTokenCookie(res, accessToken, cookieMaxAge)
    setRefreshCookie(res, refreshRaw, cookieMaxAge)

    clearAccountBlock(`suc:${sucursal_id}`)
    registerSuccessfulLogin(req, { id: userId, nombre: sucursal_nombre, rol: 'encargada' })

    return res.json({ user: { id: userId, nombre: sucursal_nombre, rol: 'encargada', sucursal_id, sucursal_nombre } })
  } catch (err) {
    console.error('Error sucursal-login:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
})

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const refreshRaw = req.cookies?.refresh_token
  if (!refreshRaw) return res.status(401).json({ error: 'No hay refresh token' })

  try {
    const hash   = hashToken(refreshRaw)
    const record = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0').get(hash)

    if (!record) {
      logSecurity('REFRESH_TOKEN_INVALID', { ip: req.ip })
      return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' })
    }
    if (new Date(record.expires_at) < new Date()) {
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(record.id)
      logSecurity('REFRESH_TOKEN_EXPIRED', { ip: req.ip, userId: record.user_id })
      return res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' })
    }

    // Verificar que el usuario/sucursal aún exista y sea válido
    let payload
    if (record.rol === 'encargada') {
      const suc     = db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(record.sucursal_id)
      if (!suc) return res.status(401).json({ error: 'Sucursal no encontrada' })
      const profile = db.prepare("SELECT id FROM profiles WHERE sucursal_id = ? AND rol = 'encargada'").get(record.sucursal_id)
      const userId  = profile?.id || record.user_id
      payload = { sub: userId, nombre: suc.nombre, rol: 'encargada', sucursal_id: record.sucursal_id, sucursal_nombre: suc.nombre }
    } else {
      const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(record.user_id)
      if (!profile) return res.status(401).json({ error: 'Usuario no encontrado' })
      const suc = profile.sucursal_id ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(profile.sucursal_id) : null
      payload = { sub: profile.id, nombre: profile.nombre, rol: profile.rol, sucursal_id: profile.sucursal_id || null, sucursal_nombre: suc?.nombre || null }
    }

    // Rotar refresh token: revocar el viejo, crear uno nuevo preservando el deadline original
    const newRefreshRaw  = generateRefreshToken()
    const newRefreshHash = hashToken(newRefreshRaw)
    const newExpiresAt   = record.expires_at // no extender — respetar cap de sesión original

    db.transaction(() => {
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(record.id)
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, rol, sucursal_id, token_hash, ip, user_agent, expires_at)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(genId(), record.user_id, record.rol, record.sucursal_id, newRefreshHash, req.ip, req.headers['user-agent'] || null, newExpiresAt)
    })()

    const expiresIn   = record.rol === 'encargada' ? process.env.JWT_EXPIRES_SUCURSAL : process.env.JWT_EXPIRES_SISTEMAS
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn })

    const refreshCookieMaxAge = new Date(newExpiresAt) - Date.now()
    setTokenCookie(res, accessToken, refreshCookieMaxAge)
    setRefreshCookie(res, newRefreshRaw, refreshCookieMaxAge)

    const body = { ok: true }
    if (record.rol !== 'encargada') body.sessionExpiresAt = newExpiresAt
    return res.json(body)
  } catch (err) {
    console.error('Error en refresh:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // Revocar refresh token si existe
  const refreshRaw = req.cookies?.refresh_token
  if (refreshRaw) {
    try {
      const hash = hashToken(refreshRaw)
      db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash)
    } catch { /* ignorar */ }
  }

  const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }
  res.clearCookie('token', opts)
  res.clearCookie('refresh_token', { ...opts, path: '/api/auth' })
  return res.json({ ok: true })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const { sub, nombre, rol, sucursal_id, sucursal_nombre } = req.user
  res.json({ id: sub, nombre, rol, sucursal_id, sucursal_nombre })
})

// ─── POST /api/auth/cerrar-sesiones-sucursales (solo admin) ──────────────────
router.post('/cerrar-sesiones-sucursales', authenticate, requireRole('admin'), (req, res) => {
  invalidateSucursalSessions()
  // Revocar también todos los refresh tokens de sucursales para que no puedan refrescar
  db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE rol = 'encargada'").run()
  logSecurity('SESSIONS_INVALIDATED', { by: req.user.nombre, rol: req.user.rol })
  logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'CERRAR_SESIONES_SUCURSALES', detalle: 'Todas las sesiones de sucursales cerradas', ip: req.ip })
  return res.json({ ok: true, message: 'Sesiones de sucursales cerradas' })
})

// ─── POST /api/auth/desbloquear-ips (solo admin) ─────────────────────────────
router.post('/desbloquear-ips', authenticate, requireRole('admin'), (req, res) => {
  const count = clearAllBlocks()
  logSecurity('IPS_UNBLOCKED', { by: req.user.nombre, cleared: count })
  logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'DESBLOQUEAR_IPS', detalle: `${count} registro(s) de bloqueo eliminados`, ip: req.ip })
  return res.json({ ok: true, message: `${count} registro(s) de bloqueo eliminados` })
})

// ─── GET /api/audit (solo admin) ─────────────────────────────────────────────
router.get('/audit', authenticate, requireRole('admin'), (req, res) => {
  try {
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100))
    const offset = Math.max(0, parseInt(req.query.offset) || 0)
    const rows   = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset)
    const total  = db.prepare('SELECT COUNT(*) as n FROM audit_log').get().n
    return res.json({ data: rows, total })
  } catch (err) {
    console.error('Error getAuditLog:', err)
    res.status(500).json({ error: 'Error al obtener audit log' })
  }
})

// ─── GET /api/security-logs (solo admin) ─────────────────────────────────────
router.get('/security-logs', authenticate, requireRole('admin'), (req, res) => {
  try {
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100))
    const offset = Math.max(0, parseInt(req.query.offset) || 0)
    const rows   = db.prepare('SELECT * FROM security_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset)
    const total  = db.prepare('SELECT COUNT(*) as n FROM security_logs').get().n
    return res.json({ data: rows, total })
  } catch (err) {
    console.error('Error getSecurityLogs:', err)
    res.status(500).json({ error: 'Error al obtener logs de seguridad' })
  }
})

export default router
