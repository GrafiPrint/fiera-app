import { useState, useEffect, useCallback } from 'react'

export function useNotifiche() {
  const [permesso, setPermesso] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  async function richiediPermesso() {
    if (typeof Notification === 'undefined') return false
    const result = await Notification.requestPermission()
    setPermesso(result)
    return result === 'granted'
  }

  function inviaNotifica(titolo, corpo, delay = 0) {
    if (permesso !== 'granted' || typeof Notification === 'undefined') return null
    const fn = () => {
      const n = new Notification(titolo, {
        body: corpo,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: titolo,
      })
      return n
    }
    if (delay > 0) {
      const t = setTimeout(fn, delay)
      return () => clearTimeout(t)
    }
    return fn()
  }

  // Programma una notifica X minuti prima di un appuntamento
  function programmaNotifica(contatto, minutiPrima = 10) {
    if (!contatto.giornoNum || !contatto.oraNorm || contatto.oraNorm === '99:99') return null
    const ora = contatto.oraNorm
    const [hh, mm] = ora.split(':').map(Number)
    const ora0 = hh * 60 + mm - minutiPrima

    // Calcola quanto manca al momento della notifica
    const adesso = new Date()
    const adessoDioggi = adesso.getHours() * 60 + adesso.getMinutes()

    // Se è nello stesso "giorno fiera" e mancano < 60 min e > 0 min
    const diff = ora0 - adessoDioggi
    if (diff <= 0 || diff > 120) return null

    const azienda = contatto.azienda || `${contatto.nome} ${contatto.cognome}`.trim()
    const stand = contatto.posizione ? ` — ${contatto.posizione}` : ''

    return inviaNotifica(
      `⏰ Appuntamento tra ${diff} min`,
      `${azienda}${stand} alle ${ora}`,
      diff * 60 * 1000
    )
  }

  return { permesso, richiediPermesso, inviaNotifica, programmaNotifica }
}
