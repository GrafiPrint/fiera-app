import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseAttivo as _supabaseAttivo } from '../lib/supabase'

// ── Fallback localStorage (quando Supabase non è configurato) ──────────────
const LS_KEY = 'fiera-app-data'
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{"fiere":[]}') }
  catch { return { fiere: [] } }
}
function lsSave(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }

const supabaseAttivo = _supabaseAttivo

// ── Mappa contatto CSV → riga DB ──────────────────────────────────────────
function contattoToRow(c, fieraId) {
  return {
    fiera_id:       fieraId,
    email:          c.email        || '',
    azienda:        c.azienda      || '',
    nome:           c.nome         || '',
    cognome:        c.cognome      || '',
    posizione:      c.posizione    || '',
    regione:        c.regione      || '',
    importanza_num: c.importanzaNum || 0,
    giorno_num:     typeof c.giornoNum === 'number' ? c.giornoNum : null,
    ora:            c.ora          || '',
    ora_norm:       c.oraNorm      || '',
    ha_appuntamento: !!c.haAppuntamento,
    riferimento:    c.riferimento  || '',
    dati:           c,             // tutto il CSV come JSON
  }
}

// ── Mappa riga DB → contatto app ──────────────────────────────────────────
export function rowToContatto(row) {
  return {
    ...row.dati,
    id:             row.id,
    fiera_id:       row.fiera_id,
    email:          row.email,
    azienda:        row.azienda,
    nome:           row.nome,
    cognome:        row.cognome,
    posizione:      row.posizione,
    regione:        row.regione,
    importanzaNum:  row.importanza_num,
    giornoNum:      row.giorno_num ?? row.dati?.giornoNum,
    ora:            row.ora,
    oraNorm:        row.ora_norm,
    haAppuntamento: row.ha_appuntamento,
    riferimento:    row.riferimento,
    notePersonali:  row.note_personali || '',
    visitato:       row.visitato       || false,
    visitatoDa:     row.visitato_da    || '',
  }
}

// ══════════════════════════════════════════════════════════════════════════
export function useFiere() {
  const [fiere,   setFiere]   = useState([])
  const [loading, setLoading] = useState(true)

  // ── Carica fiere ────────────────────────────────────────────────────────
  const caricaFiere = useCallback(async () => {
    if (!supabaseAttivo) {
      setFiere(lsLoad().fiere)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('fiere')
      .select('*, contatti(count)')
      .order('created_at', { ascending: false })
    if (!error) {
      // Carica anche il count degli appuntamenti per ogni fiera
      const fiereConAppt = await Promise.all((data || []).map(async f => {
        const { count } = await supabase
          .from('contatti')
          .select('*', { count: 'exact', head: true })
          .eq('fiera_id', f.id)
          .eq('ha_appuntamento', true)
        return { ...f, appt_count: count || 0 }
      }))
      setFiere(fiereConAppt)
    }
    setLoading(false)
  }, [])

  useEffect(() => { caricaFiere() }, [caricaFiere])

  // ── Realtime: aggiornamenti contatti da altri utenti ────────────────────
  useEffect(() => {
    if (!supabaseAttivo) return
    const channel = supabase
      .channel('contatti-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contatti' },
        () => caricaFiere()        // ricarica tutto quando qualcuno aggiorna
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'fiere' },
        () => caricaFiere()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [caricaFiere])

  // ── Aggiungi fiera ───────────────────────────────────────────────────────
  async function addFiera({ nome, luogo, dataInizio, dataFine, contatti }) {
    if (!supabaseAttivo) {
      const nuova = { id: Date.now(), nome, luogo, dataInizio, dataFine, contatti: contatti || [] }
      const d = lsLoad(); d.fiere.unshift(nuova); lsSave(d)
      setFiere(d.fiere); return
    }
    const { data: fiera, error } = await supabase
      .from('fiere')
      .insert({ nome, luogo: luogo || '', data_inizio: dataInizio || '', data_fine: dataFine || '' })
      .select().single()
    if (error || !fiera) return
    if (contatti?.length) {
      const rows = contatti.map(c => contattoToRow(c, fiera.id))
      // Inserisce a blocchi da 100 per evitare limiti Supabase
      const BATCH = 100
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error: insErr } = await supabase
          .from('contatti')
          .insert(rows.slice(i, i + BATCH))
        if (insErr) console.error('Errore inserimento batch:', insErr)
      }
    }
    caricaFiere()
  }

  // ── Elimina fiera ────────────────────────────────────────────────────────
  async function deleteFiera(id) {
    if (!supabaseAttivo) {
      const d = lsLoad(); d.fiere = d.fiere.filter(f => f.id !== id); lsSave(d)
      setFiere(d.fiere); return
    }
    await supabase.from('fiere').delete().eq('id', id)
    caricaFiere()
  }

  // ── Aggiorna contatti (CSV reload) ───────────────────────────────────────
  async function updateFieraContatti(fieraId, nuoviContatti) {
    if (!supabaseAttivo) {
      const d = lsLoad()
      d.fiere = d.fiere.map(f => f.id === fieraId ? { ...f, contatti: nuoviContatti } : f)
      lsSave(d); setFiere(d.fiere); return
    }
    // Salva i contatti "a freddo" prima di cancellare
    const { data: existing } = await supabase
      .from('contatti').select('*').eq('fiera_id', fieraId)
    const freddi = (existing || []).filter(r => r.dati?.freddo === true)

    // Cancella tutto e reinserisci CSV
    await supabase.from('contatti').delete().eq('fiera_id', fieraId)
    if (nuoviContatti.length) {
      const rows = nuoviContatti.map(c => contattoToRow(c, fieraId))
      const BATCH = 100
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error: insErr } = await supabase
          .from('contatti')
          .insert(rows.slice(i, i + BATCH))
        if (insErr) console.error('Errore inserimento batch:', insErr)
      }
    }
    // Re-inserisce i contatti freddo (senza id, Supabase ne assegna uno nuovo)
    if (freddi.length > 0) {
      const freddiRows = freddi.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest)
      const BATCH = 100
      for (let i = 0; i < freddiRows.length; i += BATCH) {
        const { error: insErr } = await supabase
          .from('contatti')
          .insert(freddiRows.slice(i, i + BATCH))
        if (insErr) console.error('Errore re-inserimento freddi:', insErr)
      }
    }
    caricaFiere()
  }

  // ── Aggiorna singolo contatto (note, visitato) ────────────────────────
  async function updateContatto(fieraId, contattoId, updates) {
    if (!supabaseAttivo) {
      const d = lsLoad()
      d.fiere = d.fiere.map(f => {
        if (f.id !== Number(fieraId)) return f
        return { ...f, contatti: f.contatti.map(c => c.id === Number(contattoId) ? { ...c, ...updates } : c) }
      })
      lsSave(d); setFiere(d.fiere); return
    }
    const dbUpdates = {}
    if (updates.notePersonali !== undefined) dbUpdates.note_personali = updates.notePersonali
    if (updates.visitato      !== undefined) dbUpdates.visitato       = updates.visitato
    if (updates.visitatoDa    !== undefined) dbUpdates.visitato_da    = updates.visitatoDa
    if (updates.riferimento   !== undefined) dbUpdates.riferimento    = updates.riferimento
    dbUpdates.updated_at = new Date().toISOString()
    await supabase.from('contatti').update(dbUpdates).eq('id', contattoId)
    // Aggiornamento locale immediato (non aspettiamo realtime)
    setFiere(prev => prev.map(f => {
      if (!f.contatti) return f
      return { ...f, contatti: f.contatti.map(c => c.id === Number(contattoId) ? { ...c, ...updates } : c) }
    }))
  }

  // ── getFiera: recupera fiera con contatti ────────────────────────────────
  function getFiera(id) {
    return fiere.find(f => String(f.id) === String(id))
  }

  // ── caricaContatti: carica tutti i contatti con paginazione ─────────────
  async function caricaContatti(fieraId) {
    if (!supabaseAttivo) {
      const d = lsLoad()
      const f = d.fiere.find(f => String(f.id) === String(fieraId))
      return f?.contatti || []
    }
    // PostgREST restituisce max 1000 righe → paginiamo
    const PAGE = 1000
    let all = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('contatti')
        .select('*')
        .eq('fiera_id', fieraId)
        .order('importanza_num', { ascending: false })
        .range(from, from + PAGE - 1)
      if (error || !data || data.length === 0) break
      all = all.concat(data.map(rowToContatto))
      if (data.length < PAGE) break
      from += PAGE
    }
    return all
  }

  return {
    fiere,
    loading,
    addFiera,
    deleteFiera,
    updateFieraContatti,
    updateContatto,
    getFiera,
    caricaContatti,
    supabaseAttivo,
  }
}
