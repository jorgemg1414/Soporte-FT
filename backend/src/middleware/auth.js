import jwt from 'jsonwebtoken'
import { getSucursalInvalidatedAt } from '../lib/database.js'

export function authenticate(req, res, next) {
  // Leer token de cookie httpOnly (preferencia) o header Authorization (fallback)
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autorizado' })
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    if (user.iat < getSucursalInvalidatedAt()) {
      return res.status(401).json({ error: 'Sesión cerrada por el administrador' })
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'Sin permisos' })
    next()
  }
}
