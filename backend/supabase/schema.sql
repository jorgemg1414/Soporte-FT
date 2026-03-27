-- ============================================
-- PORTAL DE TICKETS FT — Schema para Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. Tabla de sucursales
CREATE TABLE IF NOT EXISTS sucursales (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de perfiles (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('admin', 'encargada', 'soporte')),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Secuencia para folios internos
CREATE SEQUENCE IF NOT EXISTS ticket_folio_seq START 1;

-- 4. Función para generar folio (TKT-2025-00001)
CREATE OR REPLACE FUNCTION generate_ticket_folio()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num   INT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  seq_num   := nextval('ticket_folio_seq');
  RETURN 'R-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio         TEXT NOT NULL UNIQUE,
  titulo        TEXT NOT NULL,
  categoria     TEXT NOT NULL CHECK (categoria IN (
                  'cancelacion_documento',
                  'falla_pvwin',
                  'falla_computadora',
                  'otro'
                )),
  descripcion   TEXT,
  estado        TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN (
                  'abierto', 'en_proceso', 'resuelto', 'cerrado'
                )),
  sucursal_id   UUID REFERENCES sucursales(id) NOT NULL,
  usuario_id    UUID REFERENCES profiles(id)   NOT NULL,
  -- Campos para cancelación de documento
  tipo_documento TEXT CHECK (tipo_documento IN (
                  'factura', 'remision', 'traspaso', 'compra',
                  'nota_credito', 'devolucion', 'otro'
                )),
  folio_pvwin    TEXT,    -- folio del sistema PVWIN (a cancelar)
  folio_correcto TEXT,    -- folio correcto (reemplazo)
  -- Campos para fallas
  detalle_falla  TEXT,
  tipo_falla     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger para actualizar updated_at en tickets
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Tabla de comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  contenido  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de historial
CREATE TABLE IF NOT EXISTS historial_tickets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  accion     TEXT NOT NULL,
  detalle    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE sucursales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_tickets ENABLE ROW LEVEL SECURITY;

-- Helper: obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: obtener la sucursal del usuario actual
CREATE OR REPLACE FUNCTION get_my_sucursal()
RETURNS UUID AS $$
  SELECT sucursal_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas: SUCURSALES
CREATE POLICY "sucursales_select" ON sucursales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sucursales_all_admin" ON sucursales FOR ALL TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

-- Políticas: PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_all_admin" ON profiles FOR ALL TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Políticas: TICKETS
-- Encargada: solo ve su sucursal
-- Soporte y Admin: ven todos
CREATE POLICY "tickets_select" ON tickets FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'soporte')
    OR sucursal_id = get_my_sucursal()
  );

CREATE POLICY "tickets_insert" ON tickets FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND sucursal_id = get_my_sucursal()
  );

CREATE POLICY "tickets_update" ON tickets FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin', 'soporte'))
  WITH CHECK (get_my_rol() IN ('admin', 'soporte'));

-- Políticas: COMENTARIOS
CREATE POLICY "comentarios_select" ON comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "comentarios_insert" ON comentarios FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Políticas: HISTORIAL
CREATE POLICY "historial_select" ON historial_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "historial_insert" ON historial_tickets FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- ============================================
-- DATOS INICIALES (admin de ejemplo)
-- Después de ejecutar, crear el usuario en
-- Authentication > Users con este correo y
-- luego ejecutar el INSERT de profiles
-- ============================================
-- INSERT INTO profiles (id, nombre, rol)
-- VALUES ('<uuid-del-usuario-admin>', 'Administrador', 'admin');
