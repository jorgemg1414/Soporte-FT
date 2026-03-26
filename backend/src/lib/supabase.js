import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isMock = !url || url.includes('placeholder')

export const supabaseAuth = isMock ? null : createClient(url, anonKey)

export const supabase = isMock ? null : createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
