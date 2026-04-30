import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Grape, Calendar, Users, Trash2, Upload, X, ChevronRight, Settings, Link2, CheckCircle2, AlertCircle, Loader2, LogOut, Sheet, Share2 } from 'lucide-react'
import { useFiere } from '../hooks/useFiere'
import { useGoogleSheets } from '../hooks/useGoogleSheets'
import { useUser } from '../context/UserContext'
import CSVMapper from '../components/CSVMapper'

function AddFieraModal({ onClose, onSave }) {
  const [nome, setNome] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [luogo, setLuogo] = useState('')
  const [csvUrl, setCsvUrl] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [showMapper, setShowMapper] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handleCsvSelect(e) {
    const f = e.target.files?.[0] || null
    setCsvFile(f)
    setCsvUrl('')   // file ha priorità sull'URL
    e.target.value = ''
  }

  async function handleSave() {
    if (!nome.trim()) return
    if (csvFile) {
      setShowMapper(true)
    } else {
      await doSave([], csvUrl.trim() || null)
    }
  }

  async function doSave(contatti, url = null) {
    setLoading(true)
    await onSave({ nome: nome.trim(), dataInizio, dataFine, luogo: luogo.trim(), contatti, csvUrl: url })
    setLoading(false)
  }

  if (showMapper && csvFile) {
    return (
      <CSVMapper
        file={csvFile}
        onConfirm={(contacts) => { setShowMapper(false); doSave(contacts, null) }}
        onCancel={() => setShowMapper(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 safe-bottom">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Nuova Fiera</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome fiera *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="es. Vinitaly 2026"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
              <input
                type="date"
                value={dataInizio}
                onChange={e => setDataInizio(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
              <input
                type="date"
                value={dataFine}
                onChange={e => setDataFine(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
            <input
              type="text"
              value={luogo}
              onChange={e => setLuogo(e.target.value)}
              placeholder="es. Verona, Italia"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
            />
          </div>

          {/* Google Sheets URL — opzione principale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Sheet className="w-4 h-4 text-green-600" />
              URL Google Sheets (CSV pubblicato)
            </label>
            <input
              type="url"
              value={csvUrl}
              onChange={e => { setCsvUrl(e.target.value); setCsvFile(null) }}
              placeholder="https://docs.google.com/spreadsheets/d/e/..."
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
                csvUrl ? 'border-green-400 bg-green-50' : 'border-gray-200'
              }`}
            />
            {csvUrl && (
              <p className="text-xs text-green-600 mt-1">✓ I contatti si aggiorneranno automaticamente dal foglio</p>
            )}
          </div>

          {/* Separatore */}
          {!csvUrl && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">oppure carica un file</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Upload file CSV — opzione alternativa */}
          {!csvUrl && (
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl px-4 py-4 flex flex-col items-center gap-2 transition-colors ${
                  csvFile ? 'border-wine-400 bg-wine-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className={`w-6 h-6 ${csvFile ? 'text-wine-600' : 'text-gray-400'}`} />
                <span className={`text-sm ${csvFile ? 'text-wine-700 font-medium' : 'text-gray-500'}`}>
                  {csvFile ? csvFile.name : 'Carica file CSV'}
                </span>
              </button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvSelect} />
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!nome.trim() || loading}
          className="w-full mt-6 bg-wine-700 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Caricamento...' : csvFile ? 'Continua e Associa Colonne →' : 'Aggiungi Fiera'}
        </button>
      </div>
    </div>
  )
}

function ImpostazioniModal({ onClose }) {
  const { url, salvaUrl, testConnessione, stato } = useGoogleSheets()
  const [input, setInput] = useState(url)

  async function handleTest() {
    salvaUrl(input)
    await testConnessione()
  }

  const statoIcon = {
    idle:    null,
    syncing: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
    ok:      <CheckCircle2 className="w-4 h-4 text-green-500" />,
    error:   <AlertCircle className="w-4 h-4 text-red-500" />,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 safe-bottom">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" /> Impostazioni
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Google Sheets */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-green-600" />
            <p className="text-sm font-bold text-green-800">Connessione Google Sheets</p>
          </div>
          <p className="text-xs text-green-700 mb-3">
            Incolla l'URL della distribuzione del tuo Apps Script per sincronizzare note e visite direttamente nel foglio Google.
          </p>

          <label className="block text-xs font-medium text-gray-600 mb-1">URL Apps Script (Web App)</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <div className="flex items-center">{statoIcon[stato]}</div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => salvaUrl(input)}
              disabled={!input.trim()}
              className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-40"
            >
              Salva URL
            </button>
            <button
              onClick={handleTest}
              disabled={!input.trim() || stato === 'syncing'}
              className="flex-1 border border-green-400 text-green-700 text-xs font-bold py-2.5 rounded-xl disabled:opacity-40"
            >
              {stato === 'syncing' ? 'Test...' : 'Test connessione'}
            </button>
          </div>

          {stato === 'ok' && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Connessione riuscita
            </p>
          )}
          {stato === 'error' && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Errore — verifica l'URL
            </p>
          )}
        </div>

        {/* Istruzioni */}
        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 space-y-1">
          <p className="font-bold text-gray-700 mb-2">Come configurare (1 volta sola):</p>
          <p>1. Apri il foglio Google → <strong>Estensioni → Apps Script</strong></p>
          <p>2. Incolla il codice dal file <code className="bg-gray-200 px-1 rounded">google-apps-script/Code.gs</code></p>
          <p>3. Clicca <strong>Distribuisci → Nuova distribuzione</strong></p>
          <p>4. Tipo: <strong>App web</strong> · Esegui come: <strong>Me</strong> · Accesso: <strong>Chiunque</strong></p>
          <p>5. Copia l'URL e incollalo qui sopra</p>
        </div>
      </div>
    </div>
  )
}

function generaLinkCondivisione(fiera) {
  const config = {
    nome: fiera.nome,
    luogo: fiera.luogo || '',
    dataInizio: fiera.dataInizio || fiera.data_inizio || '',
    dataFine: fiera.dataFine || fiera.data_fine || '',
    csvUrl: fiera.csvUrl || null,
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))))
  return `${window.location.origin}${window.location.pathname}?setup=${encoded}`
}

function FieraCard({ fiera, onDelete }) {
  const navigate = useNavigate()
  const [copiato, setCopiato] = useState(false)
  // Supabase restituisce contatti come [{count: N}], localStorage come array reale
  const isSupabase = fiera.contatti?.[0]?.count !== undefined
  const totale = isSupabase ? (fiera.contatti[0].count ?? 0) : (fiera.contatti?.length ?? 0)
  const conAppt = fiera.appt_count !== undefined
    ? fiera.appt_count
    : (fiera.contatti?.filter(c => c.haAppuntamento)?.length ?? 0)

  function condividi(e) {
    e.stopPropagation()
    const link = generaLinkCondivisione(fiera)
    navigator.clipboard.writeText(link).then(() => {
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2500)
    })
  }

  function formatDate(d) {
    if (!d) return null
    return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => navigate(`/fiera/${fiera.id}`)}
        className="w-full text-left p-5 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-wine-700 flex items-center justify-center flex-shrink-0">
              <Grape className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{fiera.nome}</h3>
              {fiera.luogo && (
                <p className="text-xs text-gray-500 mt-0.5">{fiera.luogo}</p>
              )}
              {(fiera.dataInizio || fiera.dataFine) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(fiera.dataInizio)}
                  {fiera.dataFine && ` → ${formatDate(fiera.dataFine)}`}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 mt-1" />
        </div>

        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600"><strong>{totale}</strong> contatti</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-wine-500" />
            <span className="text-sm text-gray-600"><strong>{conAppt}</strong> appuntamenti</span>
          </div>
        </div>
      </button>

      <div className="border-t border-gray-50 px-5 py-2.5 flex justify-between items-center">
        <button
          onClick={condividi}
          className="flex items-center gap-1.5 text-xs py-1 transition-colors text-green-500 hover:text-green-700"
        >
          <Share2 className="w-3.5 h-3.5" />
          {copiato ? '✓ Link copiato!' : 'Condividi su altri dispositivi'}
        </button>
        <button
          onClick={() => onDelete(fiera.id)}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 py-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Elimina
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const { fiere, addFiera, deleteFiera } = useFiere()
  const { connesso } = useGoogleSheets()
  const { utente, esci } = useUser()
  const [showModal, setShowModal] = useState(false)
  const [showImpostazioni, setShowImpostazioni] = useState(false)

  async function handleSave(data) {
    await addFiera(data)
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-wine-700 text-white px-5 pt-12 pb-6 safe-top">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-wine-200 text-sm font-medium mb-1">GrafiPrint · Fiere</p>
            <h1 className="text-3xl font-bold tracking-tight">FieraApp</h1>
          </div>
          <div className="flex gap-2 items-center">
            {/* Utente corrente + logout */}
            <button
              onClick={esci}
              className="flex items-center gap-2 bg-wine-600 rounded-2xl px-3 py-2"
              title="Cambia utente"
            >
              <span className="text-sm font-semibold capitalize text-white">{utente}</span>
              <LogOut className="w-3.5 h-3.5 text-wine-200" />
            </button>
            {/* Impostazioni */}
            <button
              onClick={() => setShowImpostazioni(true)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                connesso ? 'bg-green-500' : 'bg-wine-600'
              }`}
              title="Impostazioni"
            >
              {connesso
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : <Settings className="w-5 h-5 text-white" />
              }
            </button>
          </div>
        </div>
        {connesso && (
          <div className="flex items-center gap-1.5 mt-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-green-200">Google Sheets connesso</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-5 max-w-lg mx-auto">
        {fiere.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-wine-100 flex items-center justify-center mx-auto mb-4">
              <Grape className="w-10 h-10 text-wine-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Nessuna fiera aggiunta</h2>
            <p className="text-sm text-gray-400 mb-6">
              Aggiungi la tua prima fiera e carica il CSV con gli appuntamenti.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-wine-700 text-white px-6 py-3 rounded-xl font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Fiera
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {fiere.map(f => (
                <FieraCard key={f.id} fiera={f} onDelete={deleteFiera} />
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-400 hover:border-wine-300 hover:text-wine-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Aggiungi un'altra fiera</span>
            </button>
          </>
        )}
      </div>

      {/* FAB */}
      {fiere.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-wine-700 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform safe-bottom"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      )}

      {showModal && (
        <AddFieraModal onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {showImpostazioni && (
        <ImpostazioniModal onClose={() => setShowImpostazioni(false)} />
      )}
    </div>
  )
}
