import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import ticketsRoutes from './routes/tickets.routes.js'
import sucursalesRoutes from './routes/sucursales.routes.js'
import usuariosRoutes from './routes/usuarios.routes.js'
import catalogosRoutes from './routes/catalogos.routes.js'
import { isMock } from './lib/supabase.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketsRoutes)
app.use('/api/sucursales', sucursalesRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/catalogos', catalogosRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, mock: isMock }))

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`)
  console.log(`Modo: ${isMock ? 'MOCK local' : 'Supabase'}`)
})
