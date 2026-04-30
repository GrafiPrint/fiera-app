import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, ChevronRight, Bell, BellOff, CheckCircle2, Calendar, Grape, AlertCircle } from 'lucide-react'
import { useFiere, rowToContatto } from '../hooks/useFiere'
import { supabase, supabaseAttivo } from '../lib/supabase'
import { useNotifiche } from '../hooks/useNotifiche'
import { getAgendaOggi } from '../utils/agenda'
import ImportanzaBadge from '../components/ImportanzaBadge'
import RiferentoBadge from '../components/RiferentoBadge'

function ApptCard({ contatto, fieraId, label, highlight, navigate }) {
  if (!contatto) return null
  const azienda = contatto.azienda || `${contatto.nome} ${contatto.cognome}`.trim()

  return (
    <button
      onClick={() => navigate(`/fiera/${fieraId}/contatto/${contatto.id}`)}
      className={`w-full text-left rounded-2xl p-4 shadow-sm border active:scale-[0.98] transition-transform ${
        highlight
          ? 'bg-wine-700 text-white border-wine-600'
          : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          highlight ? 'bg-wine-600 text-wine-100' : 'bg-gray-100 text-gray-500'
        }`}>
          {label}
        </span>
        {contatto.visitato && (
          <span className={`flex items-center gap-1 text-xs font-medium ${highlight ? 'text-green-300' : 'text-green-600'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Visitato
          </span>
        )}
      </div>

      <p className={`font-bold text-lg leading-tight mb-1 ${highlight ? 'text-white' : 'text-gray-900'}`}>
        {azienda}
      </p>

      {contatto.posizione && (
        <div className={`flex items-center gap-1.5 mb-2 ${highlight ? 'text-wine-200' : 'text-wine-600'}`}>
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">{contatto.posizione}</span>
        </div>
      )}

      {contatto.ora && (
        <div className={`flex items-center gap-1.5 mb-3 ${highlight ? 'text-wine-200' : 'text-gray-500'}`}>
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            {contatto.giorno && `Giorno ${contatto.giorno} — `}{contatto.ora}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 items-center flex-wrap">
          <ImportanzaBadge value={contatto.importanzaNum} />
          {contatto.riferimento && <RiferentoBadge name={contatto.riferimento} />}
        </div>
        <ChevronRight className={`w-4 h-4 ${highlight ? 'text-wine-300' : 'text-gray-300'}`} />
      </div>
    </button>
  )
}

function NotificheBanner({ permesso, onRichiedi }) {
  if (permesso === 'granted') return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">Attiva le notifiche</p>
        <p className="text-xs text-amber-600 mt-0.5">Ricevi avvisi 10 minuti prima di ogni appuntamento</p>
      </div>
      <button
        onClick={onRichiedi}
        className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
      >
        Attiva
      </button>
    </div>
  )
}

export default function Oggi() {
  const navigate = useNavigate()
  const { fiere } = useFiere()
  const { permesso, richiediPermesso, programmaNotifica } = useNotifiche()
  const [now, setNow] = useState(new Date())
  const [notificheProgrammate, setNotificheProgrammate] = useState(false)
  const [tuttiContatti, setTuttiContatti] = useState([])

  // Aggiorna l'ora ogni minuto
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Carica contatti con appuntamento direttamente da Supabase
  useEffect(() => {
    if (!supabaseAttivo || !supabase) {
      setTuttiContatti(fiere.flatMap(f =>
        (f.contatti || []).map(c => ({ ...c, _fieraId: f.id, _fieraNome: f.nome }))
      ))
      return
    }
    async function load() {
      const { data, error } = await supabase
        .from('contatti')
        .select('*, fiere(id, nome)')
        .eq('ha_appuntamento', true)
      if (!error && data) {
        setTuttiContatti(data.map(row => ({
          ...rowToContatto(row),
          _fieraId: row.fiera_id,
          _fieraNome: row.fiere?.nome || '',
        })))
      }
    }
    load()
  }, [fiere.length])

  // Agenda globale (tutte le fiere)
  const { inCorso, prossimo, oggi } = getAgendaOggi(tuttiContatti)

  // Programma notifiche per gli appuntamenti di oggi
  useEffect(() => {
    if (permesso !== 'granted' || notificheProgrammate || oggi.length === 0) return
    oggi.forEach(c => programmaNotifica(c))
    setNotificheProgrammate(true)
  }, [permesso, oggi.length])

  const oraStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const dataStr = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-wine-700 text-white px-5 pt-12 pb-6 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-wine-200 text-sm capitalize">{dataStr}</p>
            <h1 className="text-4xl font-bold tracking-tight mt-0.5">{oraStr}</h1>
          </div>
          <button
            onClick={richiediPermesso}
            className="w-10 h-10 rounded-2xl bg-wine-600 flex items-center justify-center"
          >
            {permesso === 'granted'
              ? <Bell className="w-5 h-5 text-white" />
              : <BellOff className="w-5 h-5 text-wine-300" />
            }
          </button>
        </div>

        {/* Statistiche rapide */}
        {tuttiContatti.length > 0 && (
          <div className="flex gap-4 mt-4">
            <div className="bg-wine-600 rounded-xl px-3 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-wine-200" />
              <span className="text-sm font-semibold">{oggi.length} oggi</span>
            </div>
            <div className="bg-wine-600 rounded-xl px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-300" />
              <span className="text-sm font-semibold">
                {tuttiContatti.filter(c => c.visitato).length} visitati
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Banner notifiche */}
        <NotificheBanner permesso={permesso} onRichiedi={richiediPermesso} />

        {/* Nessuna fiera */}
        {fiere.length === 0 && (
          <div className="text-center py-12">
            <Grape className="w-16 h-16 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nessuna fiera caricata</p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 text-wine-600 underline text-sm"
            >
              Vai alla home per aggiungerne una
            </button>
          </div>
        )}

        {/* Appuntamento in corso */}
        {inCorso && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              In corso
            </p>
            <ApptCard
              contatto={inCorso}
              fieraId={inCorso._fieraId}
              label="Ora"
              highlight={true}
              navigate={navigate}
            />
          </div>
        )}

        {/* Prossimo appuntamento */}
        {prossimo && prossimo.id !== inCorso?.id && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Prossimo appuntamento
            </p>
            <ApptCard
              contatto={prossimo}
              fieraId={prossimo._fieraId}
              label="Prossimo"
              highlight={false}
              navigate={navigate}
            />
          </div>
        )}

        {/* Nessun appuntamento oggi */}
        {fiere.length > 0 && oggi.length === 0 && (
          <div className="bg-white rounded-2xl p-5 text-center border border-gray-100">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-medium">
              Nessun appuntamento programmato per oggi
            </p>
          </div>
        )}

        {/* Lista appuntamenti di oggi */}
        {oggi.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tutti gli appuntamenti di oggi ({oggi.length})
            </p>
            <div className="space-y-2">
              {oggi.map(c => {
                const azienda = c.azienda || `${c.nome} ${c.cognome}`.trim()
                const isCurrent = inCorso?.id === c.id
                const isNext = prossimo?.id === c.id && !isCurrent
                return (
                  <button
                    key={`${c._fieraId}-${c.id}`}
                    onClick={() => navigate(`/fiera/${c._fieraId}/contatto/${c.id}`)}
                    className={`w-full text-left rounded-2xl px-4 py-3 border flex items-center gap-3 active:scale-[0.98] transition-transform ${
                      isCurrent ? 'bg-wine-700 border-wine-600' :
                      isNext ? 'bg-wine-50 border-wine-200' :
                      c.visitato ? 'bg-green-50 border-green-200' :
                      'bg-white border-gray-100'
                    }`}
                  >
                    {/* Ora */}
                    <div className={`flex-shrink-0 text-center w-12 ${isCurrent ? 'text-wine-200' : 'text-gray-400'}`}>
                      <p className={`text-xs font-bold ${isCurrent ? 'text-white' : isNext ? 'text-wine-700' : 'text-gray-700'}`}>
                        {c.ora || '—'}
                      </p>
                    </div>

                    <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-white' : 'text-gray-900'}`}>
                        {azienda}
                      </p>
                      {c.posizione && (
                        <p className={`text-xs truncate ${isCurrent ? 'text-wine-200' : 'text-wine-600'}`}>
                          {c.posizione}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {c.visitato && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      <ImportanzaBadge value={c.importanzaNum} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Spazio bottom bar */}
        <div className="h-4" />
      </div>
    </div>
  )
}
