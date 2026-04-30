// ============================================================
//  FieraApp Backend — Google Apps Script
//
//  INSTALLAZIONE (una volta sola):
//  1. Apri il tuo Google Sheet
//  2. Estensioni → Apps Script
//  3. Incolla questo codice, sostituendo tutto
//  4. Salva (Ctrl+S)
//  5. Esegui il deployment → Nuova distribuzione
//     - Tipo: App web
//     - Esegui come: Me
//     - Chi ha accesso: Chiunque
//  6. Copia l'URL e incollalo nelle Impostazioni dell'app (⚙️)
//
//  Dopo modifiche: Distribuisci → Gestisci distribuzione → Nuova versione
// ============================================================

// Imposta il nome del foglio (tab). Lascia vuoto per usare il primo foglio.
const SHEET_NAME = 'Vinitaly 2026'

// Colonne gestite dall'app (create automaticamente se mancanti)
const COL_EMAIL       = 'Email'
const COL_NOTE        = '*Note App'
const COL_VISITATO    = '*Visitato App'
const COL_VISITATO_DA = '*Visitato Da'
const COL_BIGLIETTO   = '*Biglietto Visita'
const COL_TIMESTAMP   = '*Ultimo aggiornamento'

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (SHEET_NAME) {
    return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0]
  }
  return ss.getSheets()[0]
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── GET: health check ────────────────────────────────────────────────────────
function doGet(e) {
  return respond({ ok: true, message: 'FieraApp Script attivo ✓' })
}

// ── POST: aggiorna nota, visitato, biglietto ─────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const sheet = getSheet()
    const data  = sheet.getDataRange().getValues()
    const hdrs  = data[0].map(h => String(h).trim())

    // Trova o crea una colonna con quel nome
    function colIdx(name) {
      let i = hdrs.indexOf(name)
      if (i === -1) {
        i = hdrs.length
        sheet.getRange(1, i + 1).setValue(name)
        hdrs.push(name)
      }
      return i
    }

    // Trova la riga per email (case-insensitive)
    const emailIdx  = hdrs.indexOf(COL_EMAIL)
    const emailTarget = String(payload.email || '').trim().toLowerCase()
    let rowNum = -1

    for (let r = 1; r < data.length; r++) {
      const rowEmail = String(data[r][emailIdx] || '').trim().toLowerCase()
      if (rowEmail && rowEmail === emailTarget) {
        rowNum = r + 1   // 1-indexed per Sheets
        break
      }
    }

    if (rowNum === -1) {
      return respond({ ok: false, error: 'Contatto non trovato: ' + payload.email })
    }

    const ts = new Date().toLocaleString('it-IT')

    // Nota personale
    if (payload.note !== undefined && payload.note !== null) {
      sheet.getRange(rowNum, colIdx(COL_NOTE) + 1).setValue(payload.note)
    }

    // Visitato + chi ha visitato (due colonne separate)
    if (payload.visitato !== undefined) {
      sheet.getRange(rowNum, colIdx(COL_VISITATO) + 1).setValue(payload.visitato ? '✓' : '')
      sheet.getRange(rowNum, colIdx(COL_VISITATO_DA) + 1).setValue(
        payload.visitato ? (payload.visitatoDa || '') : ''
      )
    }

    // Biglietto da visita (testo OCR)
    if (payload.biglietto !== undefined && payload.biglietto !== null) {
      sheet.getRange(rowNum, colIdx(COL_BIGLIETTO) + 1).setValue(payload.biglietto)
    }

    // Timestamp aggiornamento
    sheet.getRange(rowNum, colIdx(COL_TIMESTAMP) + 1).setValue(ts)

    return respond({ ok: true, message: 'Riga ' + rowNum + ' aggiornata', timestamp: ts })

  } catch (err) {
    return respond({ ok: false, error: err.message })
  }
}
