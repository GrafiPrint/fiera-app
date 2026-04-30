import { useState, useRef, useEffect } from 'react'

export function useVoiceNote({ onResult, lang = 'it-IT' }) {
  const [stato, setStato] = useState('idle')
  const [trascrizione, setTrascrizione] = useState('')
  const [errore, setErrore] = useState(null)
  const riconoscitore = useRef(null)
  const statoRef = useRef('idle')   // ref per accedere allo stato dentro i callback

  const supportato = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    if (!supportato) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = lang
    rec.continuous = false       // un'utterance alla volta — evita duplicati
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let finale = ''
      let parziale = ''
      for (let i = 0; i < e.results.length; i++) {
        const testo = e.results[i][0].transcript
        if (e.results[i].isFinal) finale += testo
        else parziale = testo
      }
      if (finale) {
        setTrascrizione(finale)
        onResult?.(finale.trim())   // solo il testo nuovo di questa utterance
        setTrascrizione('')         // resetta per la prossima
      } else {
        setTrascrizione(parziale)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return
      setErrore(e.error === 'not-allowed'
        ? 'Microfono non autorizzato. Controlla i permessi del browser.'
        : `Errore: ${e.error}`
      )
      setStato('error')
      statoRef.current = 'error'
    }

    rec.onend = () => {
      // Riavvia automaticamente finché l'utente non preme Stop
      if (statoRef.current === 'listening') {
        try { rec.start() } catch {}
      }
    }

    riconoscitore.current = rec
    return () => { try { rec.stop() } catch {} }
  }, [lang, supportato])

  function inizia() {
    if (!supportato) { setStato('unsupported'); return }
    statoRef.current = 'listening'
    setStato('listening')
    setTrascrizione('')
    setErrore(null)
    try { riconoscitore.current?.start() } catch {}
  }

  function ferma() {
    statoRef.current = 'idle'
    setStato('idle')
    setTrascrizione('')
    try { riconoscitore.current?.stop() } catch {}
  }

  return { stato, trascrizione, errore, supportato, inizia, ferma }
}
