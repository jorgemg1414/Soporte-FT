// Edge Function: crear-usuario
// Crea un usuario en Supabase Auth y su perfil, solo accesible por admins.
//
// Despliegue:
//   supabase functions deploy crear-usuario

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente con service role (puede crear usuarios)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verificar que quien llama es admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
    if (!caller) throw new Error('No autorizado')

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('rol')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.rol !== 'admin') throw new Error('Solo los administradores pueden crear usuarios')

    // Crear el nuevo usuario
    const { email, password, nombre, rol, sucursal_id } = await req.json()

    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (authError) throw new Error(authError.message)

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        nombre,
        rol,
        sucursal_id: sucursal_id || null
      })
    if (profileError) throw new Error(profileError.message)

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
