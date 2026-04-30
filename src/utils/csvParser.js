import Papa from 'papaparse'

// ── Campi interni dell'app con etichette italiane (usato da CSVMapper) ────────
export const APP_FIELDS = [
  { key: 'email',                   label: 'Email' },
  { key: 'azienda',                 label: 'Azienda' },
  { key: 'nome',                    label: 'Nome' },
  { key: 'cognome',                 label: 'Cognome' },
  { key: 'telefono',                label: 'Telefono' },
  { key: 'cellulare',               label: 'Cellulare' },
  { key: 'importanza',              label: 'Importanza (XXX)' },
  { key: 'premiumCollection',       label: 'Premium Collection' },
  { key: 'anno',                    label: 'Anno' },
  { key: 'riferimento',             label: 'Riferimento Contatto' },
  { key: 'giorno',                  label: 'Giorno appuntamento' },
  { key: 'ora',                     label: 'Ora appuntamento' },
  { key: 'posizione',               label: 'Posizione stand' },
  { key: 'regione',                 label: 'Regione' },
  { key: 'tag',                     label: 'Tag' },
  { key: 'considerazioni',          label: 'Considerazioni' },
  { key: 'richiestaPreventivoFlag', label: 'Richiesta Preventivo' },
  { key: 'preventivAccettato',      label: 'Preventivo Accettato' },
  { key: 'visitatiFiere',           label: 'Visitati in Fiere' },
  { key: 'risultatiFiere',          label: 'Risultato Fiere Precedenti' },
]

// Mappa le colonne del CSV ai campi interni dell'app
// Supporta sia il vecchio formato (con * e nomi lunghi) che il nuovo formato pulito
export const FIELD_MAP = {
  // Comuni a entrambi i formati
  'Email':                          'email',
  'Importanza':                     'importanza',
  'Phone Number':                   'telefono',
  'Appuntamento Giorno':            'giorno',
  'Appuntamento Ora':               'ora',

  // Nuovo formato (CSV Alessio)
  'Nome Contatto':                  'nome',
  'Cognome Contatto':               'cognome',
  'PREMIUM COLLECTION':             'premiumCollection',
  'Anno':                           'anno',
  'Azienda':                        'azienda',
  'Riferimento Contatto Fiera':     'riferimento',
  'Richiesta Preventivo':           'richiestaPreventivoFlag',
  'Visitati in Fiere':              'visitatiFiere',
  'Posizione Fiera':                'posizione',
  'Regione':                        'regione',
  'Considerazioni':                 'considerazioni',
  'Tag':                            'tag',

  // Colonne scritte da Apps Script (sync bidirezionale con Sheets)
  '*Note App':                      'notePersonali',
  '*Visitato App':                  'visitatoApp',

  // Vecchio formato (con asterischi) — retrocompatibilità
  'First Name':                     'nome',
  'Last Name':                      'cognome',
  '*Cellulare':                     'cellulare',
  '*PREMIUM COLLECTION':            'premiumCollection',
  '*Anno*':                         'anno',
  'Account (previously Organization)': 'azienda',
  '*Riferimento Contatto Fiera':    'riferimento',
  '*Richiesta Preventivo*':         'richiestaPreventivoFlag',
  '*Preventivo Accettato*':         'preventivAccettato',
  '*Visitati in Fiere':             'visitatiFiere',
  '*Posizione Fiera':               'posizione',
  '*Regione*':                      'regione',
  '*Azioni di Marketing effettuate': 'azioniMarketing',
  '*Considerazioni':                'considerazioni',
  '*Risultati Fiere':               'risultatiFiere',
}

// Converte la stringa importanza (XXXXX) in numero 1-5
export function importanzaToNumber(str) {
  if (!str) return 0
  return (str.match(/X/g) || []).length
}

// Normalizza il giorno (può essere numero o stringa)
export function normalizeGiorno(giorno) {
  if (!giorno) return null
  const trimmed = String(giorno).trim()
  const num = parseInt(trimmed, 10)
  if (!isNaN(num)) return num
  return trimmed
}

// Normalizza l'ora per ordinamento
export function normalizeOra(ora) {
  if (!ora) return '99:99'
  const trimmed = String(ora).trim().toLowerCase()
  if (trimmed.includes('mattina')) return '10:00'
  if (trimmed.includes('pomeriggio')) return '14:00'
  if (trimmed.includes('sera')) return '19:00'
  // già HH:MM
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed.padStart(5, '0')
  return trimmed
}

// ── Parsa testo CSV già caricato (es. da fetch URL Google Sheets) ────────────
export function parseCSVText(text) {
  const results = Papa.parse(text, { header: true, skipEmptyLines: true })
  return results.data.map((row, idx) => {
    const contact = { id: idx }
    for (const [csvKey, appKey] of Object.entries(FIELD_MAP)) {
      if (row[csvKey] === undefined) continue
      contact[appKey] = String(row[csvKey]).trim()
    }
    contact.importanzaNum  = importanzaToNumber(contact.importanza || contact.premiumCollection)
    contact.giornoNum      = normalizeGiorno(contact.giorno)
    contact.oraNorm        = normalizeOra(contact.ora)
    contact.haAppuntamento = !!contact.giornoNum
    // Converti visitatoApp (stringa dal foglio) → boolean
    if (contact.visitatoApp) {
      contact.visitato   = contact.visitatoApp.includes('✓')
      contact.visitatoDa = contact.visitatoApp.includes('✓')
        ? (contact.visitatoApp.replace('✓ Visitato', '').trim() || '')
        : ''
      delete contact.visitatoApp
    }
    return contact
  })
}

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row, idx) => {
          const contact = { id: idx }
          for (const [csvKey, appKey] of Object.entries(FIELD_MAP)) {
            // Salta se la colonna non esiste nel CSV (evita di sovrascrivere con stringa vuota)
            if (row[csvKey] === undefined) continue
            contact[appKey] = row[csvKey].trim()
          }
          contact.importanzaNum = importanzaToNumber(contact.importanza || contact.premiumCollection)
          contact.giornoNum = normalizeGiorno(contact.giorno)
          contact.oraNorm = normalizeOra(contact.ora)
          contact.haAppuntamento = !!contact.giornoNum
          return contact
        })
        resolve(mapped)
      },
      error: (err) => reject(err),
    })
  })
}

// ── Parse CSV → { headers, rows } (raw, senza mapping) ─────────────────────
export function parseCSVRaw(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve({
        headers: results.meta.fields || [],
        rows: results.data,
      }),
      error: reject,
    })
  })
}

// ── Applica un mapping personalizzato { csvCol: appField } alle righe raw ───
export function applyMapping(rows, mapping) {
  return rows.map((row, idx) => {
    const contact = { id: idx }
    Object.entries(mapping).forEach(([csvKey, appKey]) => {
      if (!appKey) return
      if (row[csvKey] === undefined) return
      contact[appKey] = String(row[csvKey]).trim()
    })
    contact.importanzaNum = importanzaToNumber(contact.importanza || contact.premiumCollection)
    contact.giornoNum     = normalizeGiorno(contact.giorno)
    contact.oraNorm       = normalizeOra(contact.ora)
    contact.haAppuntamento = !!contact.giornoNum
    return contact
  })
}
