import { useState, useEffect } from 'react'

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
      const res = await fetch(url, { method: 'GET', mode: 'no-cors' })
      setStato('ok')
      return true
    } catch (e) {
      setStato('error')
      setUltimoErrore(e.message)
      return false
    }
  }

  async function sincronizza({ email, azienda, note, visitato, fiera }) {
    if (!url || !email) return { ok: false, motivo: 'URL o email mancante' }

    setStato('syncing')
    try {
      // Usiamo no-cors perché Apps Script risponde con Content-Type text/plain
      // ma la chiamata viene comunque eseguita (fire & forget)
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ email, azienda, note, visitato, fiera }),
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
