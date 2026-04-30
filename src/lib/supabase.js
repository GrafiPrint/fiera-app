// Supabase temporaneamente disabilitato: la VPN/rete blocca le fetch a Supabase.
// L'app usa localStorage + Google Sheets CSV URL (auto-fetch) per i dati.
// Per riabilitare: ripristina createClient e imposta supabaseAttivo = true.
export const supabase = null
export const supabaseAttivo = false
