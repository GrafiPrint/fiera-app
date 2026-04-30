import { createClient } from '@supabase/supabase-js'

// Credenziali Supabase — la chiave anon è pubblica per design (protetta da RLS)
const url = import.meta.env.VITE_SUPABASE_URL  || 'https://zqplyxjmrudigqcmjzf.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGx5eGlqcnJ1ZGlncWNtanpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDM2ODgsImV4cCI6MjA5MzA3OTY4OH0.aEP6siFybKQrsbnrsNUeJuWFK60I2RK28-Mi5JMXCLw'

export const supabase = createClient(url, key)
export const supabaseAttivo = true
