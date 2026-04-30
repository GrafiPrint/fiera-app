import { useState } from 'react'

const LS_KEY = 'fiera-app-sheets-url'

export function useGoogleSheets() {
  const [url, setUrl] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [stato, setStato] = useState('idle') // idle | syncing | ok | error
  const [ultimoErrore, setUltimoErrore] = useState(null)

  function salvaUrl(nuovoUrl) {
    const u = nuovoUrl.trim()
    localStorage.setItem(LS_KEY, u)
    setUrl(u)
    setStato('idle')
    setUltimoErrore(null)
  }

  async function testConnessione() {
    if (!url) return false
    try {
      setStato('syncing')
      // no-cors: non possiamo leggere la risposta ma la richiesta arriva
      await fetch(url, { method: 'GET', mode: 'no-cors' })
      setStato('ok')
      return true
    } catch (e) {
      setStato('error')
      setUltimoErrore(e.message)
      return false
    }
  }

  // Sincronizza nota/visitato/biglietto con Google Sheets via Apps Script
  // I parametri possibili: { email, azienda, note, visitato, visitatoDa, biglietto, fiera }
  async function sincronizza(payload) {
    if (!url || !payload.email) return { ok: false, motivo: 'URL o email mancante' }

    setStato('syncing')
    try {
      // mode: 'no-cors' → la chiamata viene eseguita ma la risposta è opaca (fire & forget)
      // Apps Script riceve e salva comunque i dati
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      })
      setStato('ok')
      setUltimoErrore(null)
      return { ok: true }
    } catch (e) {
      setStato('error')
      setUltimoErrore(e.message)
      return { ok: false, motivo: e.message }
    }
  }

  const connesso = !!url

  return { url, salvaUrl, sincronizza, testConnessione, stato, ultimoErrore, connesso }
}
