# Centro de Soporte — Tickets FT

Portal interno para que las sucursales levanten reportes de fallas técnicas y el equipo de soporte los gestione.

## Stack

- **Frontend**: Vue 3 + Vite + Quasar Framework
- **Backend**: Node.js + Express (API REST con JWT)
- **Base de datos**: Supabase (PostgreSQL) — en desarrollo usa mock en memoria

## Estructura del proyecto

```
Tickets-FT/
├── src/                  # Frontend Vue 3
│   ├── pages/            # Vistas (Login, Dashboard, Tickets, Admin)
│   ├── stores/           # Pinia (auth, tickets)
│   ├── router/           # Vue Router con guards por rol
│   ├── layouts/          # MainLayout con sidebar y header
│   └── lib/              # Axios (api.js)
├── backend/              # API Express
│   └── src/
│       ├── routes/       # auth, tickets, sucursales, usuarios, catalogos
│       ├── middleware/   # JWT authenticate + requireRole
│       ├── data/         # mock.js (datos en memoria para desarrollo)
│       └── lib/          # supabase.js (detecta modo mock automáticamente)
├── public/               # Archivos estáticos (logo)
└── supabase/             # schema.sql para crear las tablas en Supabase
```

## Roles

| Rol         | Acceso |
|-------------|--------|
| `encargada` | Crea tickets, ve solo los de su sucursal |
| `soporte`   | Ve y gestiona todos los tickets |
| `admin`     | Todo lo anterior + panel de administración |

## Instalación y desarrollo local

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd Tickets-FT
npm install
cd backend && npm install && cd ..
```

### 2. Variables de entorno del backend

Crea el archivo `backend/.env`:

```env
PORT=3001
JWT_SECRET=cambia_esto_por_un_secreto_seguro

# Supabase (dejar como placeholder para usar mock local)
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
```

> Si `SUPABASE_URL` contiene `placeholder`, el backend corre en **modo mock** con datos en memoria (no se necesita Supabase para desarrollar).

### 3. Iniciar en desarrollo

```bash
npm run dev
```

Esto levanta ambos servidores en paralelo:
- Frontend: http://localhost:5173
- Backend:  http://localhost:3001

## Credenciales de prueba (modo mock)

| Usuario      | Contraseña    | Rol              |
|--------------|---------------|------------------|
| `admin`      | `admin123`    | Administrador    |
| `soporte`    | `sop123`      | Soporte Técnico  |
| `gonzalez`   | `gonzalez`    | Encargada GONZALEZ |
| `mezcala`    | `mezcala`     | Encargada MEZCALA  |

> El resto de las sucursales usan el nombre en minúsculas como contraseña.

## Conectar con Supabase (producción)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `supabase/schema.sql` en el SQL Editor
3. Actualizar `backend/.env` con las credenciales reales:
   ```env
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
4. El backend detecta automáticamente que no es placeholder y usa Supabase

## Scripts disponibles

```bash
npm run dev           # Frontend + Backend en paralelo
npm run dev:frontend  # Solo el frontend (Vite)
npm run dev:backend   # Solo el backend (Node --watch)
npm run build         # Build de producción del frontend
```
