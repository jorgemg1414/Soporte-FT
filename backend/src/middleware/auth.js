import jwt from 'jsonwebtoken'
import { getSucursalInvalidatedAt } from '../data/mock.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' })
  try {
    const user = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    if (user.rol === 'encargada' && user.iat < getSucursalInvalidatedAt()) {
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
