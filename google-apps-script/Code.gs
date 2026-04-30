// ============================================================
//  FieraApp — Google Apps Script
//  Incolla questo codice in:
//  Google Sheets → Estensioni → Apps Script
//  Poi: Distribuisci → Nuova distribuzione → App web
//    Esegui come: Me
//    Chi ha accesso: Chiunque
//  Copia l'URL della distribuzione e incollalo nelle
//  Impostazioni dell'app FieraApp.
// ============================================================

const SPREADSHEET_ID = '1S3ZGdHNsI-odafHKv43iA8cvGZFKTIee-t-VZaBZKLw'
const SHEET_NAME     = 'Vinitaly 2026'   // nome del foglio (tab)

// Colonne che lo script aggiunge/aggiorna (se non esistono le crea)
const COL_NOTE_APP    = '*Note App'
const COL_VISITATO    = '*Visitato App'
const COL_TIMESTAMP   = '*Ultimo aggiornamento'

// ---- CORS headers ----
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// ---- GET: health check ----
function doGet(e) {
  return respond({ ok: true, message: 'FieraApp Script attivo' })
}

// ---- POST: aggiorna nota e/o visitato ----
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    // payload: { email, azienda, note, visitato, fiera }

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID)
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0]
    const data  = sheet.getDataRange().getValues()
    const hdrs  = data[0].map(h => String(h).trim())

    // --- Trova o crea le colonne speciali ---
    function colIdx(name) {
      let i = hdrs.indexOf(name)
      if (i === -1) {
        i = hdrs.length
        sheet.getRange(1, i + 1).setValue(name)
        hdrs.push(name)
      }
      return i
    }

    const emailIdx    = hdrs.indexOf('Email')
    const noteIdx     = colIdx(COL_NOTE_APP)
    const visitatoIdx = colIdx(COL_VISITATO)
    const tsIdx       = colIdx(COL_TIMESTAMP)

    // --- Trova la riga per email ---
    let rowNum = -1
    for (let r = 1; r < data.length; r++) {
      const rowEmail = String(data[r][emailIdx] || '').trim().toLowerCase()
      if (rowEmail === String(payload.email || '').trim().toLowerCase()) {
        rowNum = r + 1  // 1-indexed per Sheets
        break
      }
    }

    if (rowNum === -1) {
      return respond({ ok: false, error: 'Contatto non trovato (email non corrisponde)' })
    }

    const ts = new Date().toLocaleString('it-IT')

    // --- Aggiorna celle ---
    if (payload.note !== undefined && payload.note !== null) {
      sheet.getRange(rowNum, noteIdx + 1).setValue(payload.note)
    }
    if (payload.visitato !== undefined) {
      sheet.getRange(rowNum, visitatoIdx + 1).setValue(payload.visitato ? '✓ Visitato' : '')
    }
    sheet.getRange(rowNum, tsIdx + 1).setValue(ts)

    return respond({
      ok: true,
      message: `Riga ${rowNum} aggiornata`,
      timestamp: ts,
    })

  } catch (err) {
    return respond({ ok: false, error: err.message })
  }
}
