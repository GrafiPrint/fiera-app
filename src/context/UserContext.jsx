import { createContext, useContext, useState } from 'react'
import { Grape } from 'lucide-react'

const UserContext = createContext(null)

export const UTENTI = [
  {
    id: 'alessio',
    label: 'Alessio',
    color: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
  {
    id: 'fabio',
    label: 'Fabio',
    color: 'bg-purple-500',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
  },
  {
    id: 'rosy',
    label: 'Rosy',
    color: 'bg-pink-500',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
  },
]

export function UserProvider({ children }) {
  const [utente, setUtente] = useState(
    () => localStorage.getItem('fp-utente') || null
  )

  function scegli(id) {
    localStorage.setItem('fp-utente', id)
    setUtente(id)
  }

  function esci() {
    localStorage.removeItem('fp-utente')
    setUtente(null)
  }

  if (!utente) {
    return <SceltaUtente onScegli={scegli} />
  }

  return (
    <UserContext.Provider value={{ utente, scegli, esci }}>
      {children}
    </UserContext.Provider>
  )
}

function SceltaUtente({ onScegli }) {
  return (
    <div
      className="min-h-screen bg-wine-700 flex flex-col items-center justify-center p-6"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-wine-600 rounded-3xl flex items-center justify-center mb-4 shadow-2xl">
            <Grape className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">FieraApp</h1>
          <p className="text-wine-200 mt-2 text-base font-medium">GrafiPrint</p>
        </div>

        {/* Titolo */}
        <p className="text-center text-wine-200 text-sm font-semibold uppercase tracking-widest mb-5">
          Chi sei?
        </p>

        {/* Bottoni utente */}
        <div className="space-y-3">
          {UTENTI.map(u => (
            <button
              key={u.id}
              onClick={() => onScegli(u.id)}
              className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 active:scale-[0.97] transition-transform shadow-xl"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${u.color} flex items-center justify-center shadow-md flex-shrink-0`}
              >
                <span className="text-2xl font-black text-white">{u.label[0]}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-xl font-bold text-gray-900">{u.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">GrafiPrint Etichette</p>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser deve essere usato dentro <UserProvider>')
  return ctx
}

// Helper: restituisce config colore per un dato id utente
export function getUserConfig(id) {
  return UTENTI.find(u => u.id === id) || null
}
