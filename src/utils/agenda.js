import { normalizeOra } from './csvParser'

// Converte "HH:MM" o "tarda mattinata" ecc. in minuti dall'inizio del giorno
function oraToMinuti(ora) {
  if (!ora) return 9999
  const norm = normalizeOra(ora)
  const [hh, mm] = norm.split(':').map(Number)
  if (isNaN(hh)) return 9999
  return hh * 60 + (mm || 0)
}

// Dato un numero di giorno (es. 13) e ora (es. "11:00")
// restituisce quanti minuti mancano da adesso
export function minutiMancanti(giornoNum, ora) {
  if (!giornoNum) return Infinity
  const adesso = new Date()
  const giornoAdesso = adesso.getDate()
  const minAdesso = adesso.getHours() * 60 + adesso.getMinutes()
  const minAppt = oraToMinuti(ora)
  const deltaDays = Number(giornoNum) - giornoAdesso
  return deltaDays * 24 * 60 + (minAppt - minAdesso)
}

// Dalla lista contatti, trova il prossimo appuntamento e quello corrente (±30 min)
export function getAgendaOggi(contatti) {
  const adesso = new Date()
  const giornoAdesso = adesso.getDate()
  const minAdesso = adesso.getHours() * 60 + adesso.getMinutes()

  const conAppt = contatti
    .filter(c => c.haAppuntamento && c.giornoNum)
    .map(c => ({
      ...c,
      _minuti: minutiMancanti(c.giornoNum, c.ora),
      _minAppt: oraToMinuti(c.ora),
    }))
    .sort((a, b) => a._minuti - b._minuti)

  // "In corso" = appuntamento di oggi entro ±30 min dall'orario
  const inCorso = conAppt.find(c =>
    Number(c.giornoNum) === giornoAdesso &&
    Math.abs(c._minAppt - minAdesso) <= 30
  ) || null

  // Prossimo = appuntamento futuro (mancano > 0 min)
  const prossimo = conAppt.find(c => c._minuti > 0) || null

  // Oggi = tutti gli appuntamenti di oggi
  const oggi = conAppt.filter(c => Number(c.giornoNum) === giornoAdesso)

  return { inCorso, prossimo, oggi }
}
