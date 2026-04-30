// Estrae il padiglione da stringhe tipo:
// "Hall 9 Stand C8" → "Hall 9"
// "Padiglione 11, Stand E2" → "Pad. 11"
// "Hall A Stand 47" → "Hall A"
// "Hall C Stand 105" → "Hall C"
// "chiamare, visitatore" → null

export function extractPadiglione(posizione) {
  if (!posizione) return null
  const s = posizione.trim()

  // "Padiglione N" o "Padiglione N,"
  const padMatch = s.match(/padiglione\s+(\w+)/i)
  if (padMatch) return `Pad. ${padMatch[1]}`

  // "Hall X" dove X è lettera o numero
  const hallMatch = s.match(/hall\s+(\w+)/i)
  if (hallMatch) return `Hall ${hallMatch[1].toUpperCase()}`

  return null
}
