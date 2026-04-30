import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Clock, Phone, Mail, User, Tag, FileText, History, Building2, CheckCircle2, XCircle, Save, RefreshCw, WifiOff, Mic, MicOff, Square, Pencil, X } from 'lucide-react'
import { useFiere, rowToContatto } from '../hooks/useFiere'
import { supabase, supabaseAttivo } from '../lib/supabase'
import { useGoogleSheets } from '../hooks/useGoogleSheets'
import { useVoiceNote } from '../hooks/useVoiceNote'
import { useUser, getUserConfig } from '../context/UserContext'
import ImportanzaBadge from '../components/ImportanzaBadge'
import RiferentoBadge from '../components/RiferentoBadge'

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

const RISULTATO_CONFIG = {
  'Molto Interessato': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  'Interessato':       { bg: 'bg-lime-100',  text: 'text-lime-800',  dot: 'bg-lime-500'  },
  'Non Interessato':   { bg: 'bg-red-100',   text: 'text-red-800',   dot: 'bg-red-500'   },
  'Non Visitato':      { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400'  },
}

export default function ContattoDetail() {
  const { id, cid } = useParams()
  const navigate = useNavigate()
  const { updateContatto, getFiera } = useFiere()

  // Contatto + nome fiera caricati direttamente da Supabase
  const [contatto, setContatto] = useState(null)
  const [fieraNome, setFieraNome] = useState('')
  const [loadingContatto, setLoadingContatto] = useState(true)

  useEffect(() => {
    if (!cid) return
    async function fetchContatto() {
      // ── Supabase ────────────────────────────────────────────────────────
      if (supabaseAttivo && supabase) {
        const { data, error } = await supabase
          .from('contatti')
          .select('*, fiere(nome)')
          .eq('id', cid)
          .single()
        if (!error && data) {
          setContatto(rowToContatto(data))
          setFieraNome(data.fiere?.nome || '')
          setLoadingContatto(false)
          return
        }
      }
      // ── localStorage fallback ────────────────────────────────────────────
      const fiera = getFiera(id)
      if (fiera?.contatti) {
        const c = fiera.contatti.find(c => String(c.id) === String(cid))
        if (c) {
          setContatto(c)
          setFieraNome(fiera.nome || '')
          setLoadingContatto(false)
          return
        }
      }
      setLoadingContatto(false)
    }
    fetchContatto()
  }, [cid])

  const { utente } = useUser()
  const { sincronizza, connesso } = useGoogleSheets()
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [syncStato, setSyncStato] = useState('idle')

  // Riferimento editor
  const [editingRif, setEditingRif] = useState(false)
  const [rifValue, setRifValue] = useState('')
  const REFERENTI_NOTI = ['Fabio', 'Alessio', 'Rosy', 'BV']

  async function saveRiferimento() {
    setContatto(c => ({ ...c, riferimento: rifValue }))
    updateContatto(id, cid, { riferimento: rifValue })
    setEditingRif(false)
  }

  useEffect(() => {
    if (contatto) setNoteText(contatto.notePersonali || '')
  }, [contatto?.id])

  const voice = useVoiceNote({
    onResult: (testo) => {
      // Appende la trascrizione al testo esistente
      setNoteText(prev => {
        const base = prev.trim()
        return base ? base + '\n' + testo : testo
      })
    },
  })

  if (!contatto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">{loadingContatto ? 'Caricamento...' : 'Contatto non trovato'}</p>
          {!loadingContatto && (
            <button onClick={() => navigate(-1)} className="mt-3 text-wine-600 underline text-sm">
              Torna indietro
            </button>
          )}
        </div>
      </div>
    )
  }

  const risultato = RISULTATO_CONFIG[contatto.risultatiFiere]
  const nomeCompleto = `${contatto.nome || ''} ${contatto.cognome || ''}`.trim()
  const telPulito = (contatto.cellulare || contatto.telefono || '').replace(/\s/g, '')

  async function toggleVisitato() {
    const nuovoStato = !contatto.visitato
    const visitatoDa = nuovoStato ? utente : ''
    setContatto(c => ({ ...c, visitato: nuovoStato, visitatoDa }))
    updateContatto(id, cid, { visitato: nuovoStato, visitatoDa })
    if (connesso && contatto.email) {
      setSyncStato('syncing')
      const res = await sincronizza({ email: contatto.email, azienda: contatto.azienda, visitato: nuovoStato, fiera: fieraNome })
      setSyncStato(res.ok !== false ? 'ok' : 'error')
      setTimeout(() => setSyncStato('idle'), 3000)
    }
  }

  async function saveNote() {
    setContatto(c => ({ ...c, notePersonali: noteText }))
    updateContatto(id, cid, { notePersonali: noteText })
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2500)
    if (connesso && contatto.email) {
      setSyncStato('syncing')
      const res = await sincronizza({ email: contatto.email, azienda: contatto.azienda, note: noteText, visitato: contatto.visitato, fiera: fieraNome })
      setSyncStato(res.ok !== false ? 'ok' : 'error')
      setTimeout(() => setSyncStato('idle'), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-wine-700 text-white px-4 pt-12 pb-6 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-wine-600 flex items-center justify-center active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-wine-200 text-sm flex-1">{fieraNome}</span>
          {/* Stato sync Sheets */}
          {connesso && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              syncStato === 'syncing' ? 'bg-blue-500/30 text-blue-200' :
              syncStato === 'ok'      ? 'bg-green-500/30 text-green-200' :
              syncStato === 'error'   ? 'bg-red-500/30 text-red-200' :
              'bg-wine-600/50 text-wine-300'
            }`}>
              {syncStato === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
              {syncStato === 'ok'      && <CheckCircle2 className="w-3 h-3" />}
              {syncStato === 'error'   && <WifiOff className="w-3 h-3" />}
              {syncStato === 'idle'    && <CheckCircle2 className="w-3 h-3" />}
              <span>
                {syncStato === 'syncing' ? 'Sync...' :
                 syncStato === 'ok'      ? 'Salvato' :
                 syncStato === 'error'   ? 'Errore' : 'Sheets'}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl bg-wine-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl leading-tight break-words">
              {contatto.azienda || nomeCompleto}
            </h1>
            {contatto.azienda && nomeCompleto && (
              <p className="text-wine-200 text-sm mt-0.5">{nomeCompleto}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              <ImportanzaBadge value={contatto.importanzaNum} size="lg" />
              {contatto.riferimento && <RiferentoBadge name={contatto.riferimento} />}
              {contatto.regione && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-wine-600 text-wine-100">
                  {contatto.regione}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pulsante Visitato */}
      <div className="mx-4 -mt-3 mb-3">
        <button
          onClick={toggleVisitato}
          className={`w-full rounded-2xl py-3.5 flex items-center justify-center gap-2.5 font-bold text-sm shadow-md active:scale-[0.98] transition-all ${
            contatto.visitato
              ? 'bg-green-500 text-white'
              : 'bg-white text-gray-600 border-2 border-dashed border-gray-300'
          }`}
        >
          {contatto.visitato ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              VISITATO
              {contatto.visitatoDa && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/30 capitalize`}>
                  da {contatto.visitatoDa}
                </span>
              )}
            </>
          ) : (
            <><XCircle className="w-5 h-5 text-gray-400" /> Segna come Visitato</>
          )}
        </button>
      </div>

      {/* Appuntamento banner */}
      {(contatto.posizione || contatto.giorno || contatto.ora) && (
        <div className="mx-4 mb-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4">
          {contatto.posizione && (
            <div className="flex-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-wine-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Stand</p>
                <p className="text-sm font-bold text-wine-700 leading-tight">{contatto.posizione}</p>
              </div>
            </div>
          )}
          {(contatto.giorno || contatto.ora) && (
            <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Appuntamento</p>
                <p className="text-sm font-bold text-gray-800">
                  {contatto.giorno && `Gg. ${contatto.giorno}`}
                  {contatto.giorno && contatto.ora && ' · '}
                  {contatto.ora}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risultato fiera precedente */}
      {contatto.risultatiFiere && risultato && (
        <div className={`mx-4 mb-3 ${risultato.bg} rounded-2xl px-4 py-3 flex items-center gap-2`}>
          <div className={`w-2 h-2 rounded-full ${risultato.dot}`} />
          <span className={`text-sm font-medium ${risultato.text}`}>
            Fiera precedente: {contatto.risultatiFiere}
          </span>
        </div>
      )}

      {/* Sezioni */}
      <div className="px-4 pb-12 space-y-3 max-w-lg mx-auto">

        {/* Contatti + CTA */}
        <Section title="Contatti">
          <InfoRow icon={User} label="Referente" value={nomeCompleto || null} />
          <InfoRow icon={Mail} label="Email" value={contatto.email} />
          <InfoRow icon={Phone} label="Cellulare" value={contatto.cellulare} />
          <InfoRow icon={Phone} label="Telefono" value={contatto.telefono} />
        </Section>

        {telPulito && (
          <div className="flex gap-2">
            <a
              href={`tel:${telPulito}`}
              className="flex-1 bg-green-500 text-white rounded-2xl py-3 flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              <Phone className="w-4 h-4" /> Chiama
            </a>
            <a
              href={`https://wa.me/${telPulito.replace('+', '')}`}
              target="_blank" rel="noreferrer"
              className="flex-1 bg-[#25D366] text-white rounded-2xl py-3 flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            {contatto.email && (
              <a
                href={`mailto:${contatto.email}`}
                className="flex-1 bg-blue-500 text-white rounded-2xl py-3 flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-[0.97] transition-transform"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            )}
          </div>
        )}

        {/* Note personali + Voce */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Note personali
            </h3>
            {voice.supportato && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Voce disponibile
              </span>
            )}
          </div>

          {/* Area testo */}
          <div className="relative">
            <textarea
              value={voice.stato === 'listening'
                ? (noteText.trim() ? noteText + '\n' : '') + voice.trascrizione
                : noteText
              }
              onChange={e => { if (voice.stato !== 'listening') { setNoteText(e.target.value); setNoteSaved(false) } }}
              placeholder={voice.stato === 'listening' ? '🎙 In ascolto...' : 'Scrivi oppure usa il microfono per dettare...'}
              rows={5}
              className={`w-full text-sm text-gray-800 placeholder-gray-400 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 resize-none transition-colors ${
                voice.stato === 'listening'
                  ? 'border-red-300 bg-red-50 focus:ring-red-300'
                  : 'border-gray-200 focus:ring-wine-400'
              }`}
              readOnly={voice.stato === 'listening'}
            />
            {voice.stato === 'listening' && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                REC
              </div>
            )}
          </div>

          {/* Errore voce */}
          {voice.errore && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <MicOff className="w-3 h-3" /> {voice.errore}
            </p>
          )}

          {/* Pulsanti azione */}
          <div className="flex gap-2 mt-3">
            {/* Microfono */}
            {voice.supportato && (
              voice.stato === 'listening' ? (
                <button
                  onClick={() => {
                    // Ferma e consolida il testo trascritto
                    const finale = (noteText.trim() ? noteText + '\n' : '') + voice.trascrizione
                    setNoteText(finale.trim())
                    voice.ferma()
                    setNoteSaved(false)
                  }}
                  className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={voice.inizia}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform hover:bg-gray-200"
                >
                  <Mic className="w-4 h-4 text-wine-600" />
                  Detta
                </button>
              )
            )}

            {/* Salva */}
            <button
              onClick={saveNote}
              disabled={voice.stato === 'listening'}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                noteSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-wine-700 text-white active:scale-[0.98]'
              }`}
            >
              {syncStato === 'syncing'
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />
              }
              {noteSaved
                ? (connesso ? '✓ Salvato + Sheets!' : '✓ Salvato!')
                : 'Salva Note'
              }
            </button>
          </div>

          {connesso && (
            <p className="text-xs text-gray-400 text-center mt-1.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              Si sincronizza con Google Sheets al salvataggio
            </p>
          )}
        </div>

        {/* Considerazioni dal CSV */}
        {contatto.considerazioni && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Considerazioni (CRM)
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {contatto.considerazioni}
            </p>
          </div>
        )}

        {/* Tag */}
        {contatto.tag && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-purple-100 text-purple-700">
              {contatto.tag}
            </span>
          </div>
        )}

        {/* Riferimento Contatto Fiera */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Riferimento Fiera</h3>
            {!editingRif && (
              <button
                onClick={() => { setRifValue(contatto.riferimento || ''); setEditingRif(true) }}
                className="flex items-center gap-1 text-xs text-wine-600 font-medium active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5" />
                {contatto.riferimento ? 'Modifica' : 'Assegna'}
              </button>
            )}
          </div>

          {editingRif ? (
            <div className="space-y-3">
              {/* Chip referenti noti */}
              <div className="flex flex-wrap gap-2">
                {REFERENTI_NOTI.map(r => (
                  <button
                    key={r}
                    onClick={() => setRifValue(r)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      rifValue === r
                        ? 'bg-wine-700 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                {rifValue && !REFERENTI_NOTI.includes(rifValue) && (
                  <button
                    onClick={() => setRifValue('')}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-500 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Rimuovi
                  </button>
                )}
              </div>
              {/* Input custom */}
              <input
                type="text"
                value={rifValue}
                onChange={e => setRifValue(e.target.value)}
                placeholder="Oppure scrivi un nome..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wine-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingRif(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600"
                >
                  Annulla
                </button>
                <button
                  onClick={saveRiferimento}
                  className="flex-1 py-2 rounded-xl bg-wine-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Salva
                </button>
              </div>
            </div>
          ) : (
            <div>
              {contatto.riferimento ? (
                <RiferentoBadge name={contatto.riferimento} />
              ) : (
                <p className="text-sm text-gray-400 italic">Nessun referente assegnato</p>
              )}
            </div>
          )}
        </div>

        {/* Dettagli commerciali */}
        <Section title="Dettagli Commerciali">
          <InfoRow icon={Tag} label="Anno primo contatto" value={contatto.anno} />
          <InfoRow icon={Tag} label="Premium Collection" value={contatto.premiumCollection} />
          <InfoRow icon={Tag} label="Richiesta Preventivo" value={contatto.richiestaPreventivoFlag} />
          <InfoRow icon={Tag} label="Preventivo Accettato" value={contatto.preventivAccettato} />
          <InfoRow icon={Tag} label="Azioni Marketing" value={contatto.azioniMarketing} />
        </Section>

        {/* Storico fiere */}
        {(contatto.visitatiFiere || contatto.risultatiFiere) && (
          <Section title="Storico Fiere">
            <InfoRow icon={History} label="Visitati in" value={contatto.visitatiFiere} />
            <InfoRow icon={History} label="Risultato" value={contatto.risultatiFiere} />
          </Section>
        )}
      </div>
    </div>
  )
}
