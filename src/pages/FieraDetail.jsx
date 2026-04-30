import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Upload, SlidersHorizontal, X, Calendar, Loader2, Plus, UserPlus } from 'lucide-react'
import { useFiere, rowToContatto } from '../hooks/useFiere'
import { supabase, supabaseAttivo } from '../lib/supabase'
import { normalizeOra, parseCSVText } from '../utils/csvParser'
import { extractPadiglione } from '../utils/padiglione'
import AppuntamentoCard from '../components/AppuntamentoCard'
import CSVMapper from '../components/CSVMapper'

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-wine-700 text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

const SORT_OPTIONS = [
  { key: 'giorno-ora-imp', label: 'Giorno → Ora → Importanza' },
  { key: 'imp-giorno-ora', label: 'Importanza → Giorno → Ora' },
  { key: 'stand',          label: 'Stand / Posizione' },
]

export default function FieraDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getFiera, updateFieraContatti, caricaContatti } = useFiere()
  const fiera = getFiera(id)

  // Contatti: query diretta a Supabase, senza hook intermedi
  const [contatti, setContatti] = useState([])
  const [loadingContatti, setLoadingContatti] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) return
    setContatti([])
    setLoadingContatti(true)

    async function fetchContatti() {
      try {
        // Se la fiera ha un URL Google Sheets, carica sempre dati freschi
        if (fiera?.csvUrl) {
          const res = await fetch(fiera.csvUrl)
          const text = await res.text()
          const parsed = parseCSVText(text)
          // Carica note/visitato locali e unisci per email
          const locali = await caricaContatti(id)
          const localiByEmail = {}
          locali.forEach(c => { if (c.email) localiByEmail[c.email.toLowerCase()] = c })
          const merged = parsed.map((c, i) => {
            const old = c.email ? localiByEmail[c.email.toLowerCase()] : null
            return {
              ...c,
              id: i,
              notePersonali: c.notePersonali || old?.notePersonali || '',
              visitato:      c.visitato      || old?.visitato      || false,
              visitatoDa:    c.visitatoDa    || old?.visitatoDa    || '',
            }
          })
          await updateFieraContatti(fiera.id, merged)
          setContatti(merged)
        } else {
          const data = await caricaContatti(id)
          setContatti(data)
        }
      } catch (e) {
        console.error('fetchContatti error:', e)
        // Fallback ai dati locali in caso di errore di rete
        try {
          const data = await caricaContatti(id)
          setContatti(data)
        } catch {}
      }
      setLoadingContatti(false)
    }

    fetchContatti()
  }, [id, refreshKey, fiera?.csvUrl])

  const [search, setSearch] = useState('')
  const [giornoFiltro, setGiornoFiltro] = useState('tutti')
  const [riferimentoFiltro, setRiferimentoFiltro] = useState('tutti')
  const [padiglioneF, setPadiglioneF] = useState('tutti')
  const [soloConAppt, setSoloConAppt] = useState(false)
  const [sortKey, setSortKey] = useState('giorno-ora-imp')
  const [showFilters, setShowFilters] = useState(false)
  const [csvMapperFile, setCsvMapperFile] = useState(null)
  const fileRef = useRef()

  // Contatti "A Freddo"
  const [showFreddoForm, setShowFreddoForm] = useState(false)
  const FREDDO_EMPTY = { nome: '', cognome: '', azienda: '', posizione: '', telefono: '', note: '', riferimento: '' }
  const [freddoForm, setFreddoForm] = useState(FREDDO_EMPTY)
  const [savedFreddo, setSavedFreddo] = useState(false)

  async function handleAddFreddo() {
    if (!freddoForm.nome && !freddoForm.azienda) return
    const row = {
      fiera_id: id,
      nome: freddoForm.nome || '',
      cognome: freddoForm.cognome || '',
      azienda: freddoForm.azienda || '',
      posizione: freddoForm.posizione || '',
      email: '',
      regione: '',
      importanza_num: 0,
      giorno_num: null,
      ora: '',
      ora_norm: '99:99',
      ha_appuntamento: false,
      riferimento: freddoForm.riferimento || '',
      note_personali: freddoForm.note || '',
      dati: { freddo: true },
    }
    if (!supabaseAttivo || !supabase) return
    const { error } = await supabase.from('contatti').insert(row)
    if (!error) {
      setSavedFreddo(true)
      setFreddoForm(FREDDO_EMPTY)
      setRefreshKey(k => k + 1)
      setTimeout(() => setSavedFreddo(false), 2000)
    }
  }

  // ── Tutti i useMemo PRIMA del guard if(!fiera) — Rules of Hooks ──────────
  const giorni = useMemo(() => {
    const set = new Set()
    contatti.forEach(c => { if (c.giornoNum) set.add(c.giornoNum) })
    return [...set].sort((a, b) => Number(a) - Number(b))
  }, [contatti])

  const riferimenti = useMemo(() => {
    const set = new Set()
    contatti.forEach(c => { if (c.riferimento) set.add(c.riferimento) })
    return [...set].sort()
  }, [contatti])

  const padiglioni = useMemo(() => {
    const set = new Set()
    contatti.forEach(c => {
      const p = extractPadiglione(c.posizione)
      if (p) set.add(p)
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }))
  }, [contatti])

  const filtered = useMemo(() => {
    return contatti
      .filter(c => {
        if (soloConAppt && !c.haAppuntamento) return false
        if (giornoFiltro !== 'tutti' && String(c.giornoNum) !== String(giornoFiltro)) return false
        if (riferimentoFiltro !== 'tutti' && c.riferimento !== riferimentoFiltro) return false
        if (padiglioneF !== 'tutti') {
          const p = extractPadiglione(c.posizione)
          if (p !== padiglioneF) return false
        }
        if (search) {
          const q = search.toLowerCase()
          const hay = `${c.azienda} ${c.nome} ${c.cognome} ${c.posizione} ${c.regione}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortKey === 'imp-giorno-ora') {
          if (b.importanzaNum !== a.importanzaNum) return b.importanzaNum - a.importanzaNum
          if (a.giornoNum !== b.giornoNum) return Number(a.giornoNum || 99) - Number(b.giornoNum || 99)
          return normalizeOra(a.ora).localeCompare(normalizeOra(b.ora))
        }
        if (sortKey === 'stand') {
          const pa = (a.posizione || 'zzz').toLowerCase()
          const pb = (b.posizione || 'zzz').toLowerCase()
          return pa.localeCompare(pb, 'it', { numeric: true })
        }
        // Default: giorno-ora-imp
        if (a.giornoNum !== b.giornoNum) return Number(a.giornoNum || 99) - Number(b.giornoNum || 99)
        const oraCmp = normalizeOra(a.ora).localeCompare(normalizeOra(b.ora))
        if (oraCmp !== 0) return oraCmp
        return b.importanzaNum - a.importanzaNum
      })
  }, [contatti, search, giornoFiltro, riferimentoFiltro, padiglioneF, soloConAppt, sortKey])

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach(c => {
      const key = c.giornoNum ? `Giorno ${c.giornoNum}` : 'Senza appuntamento'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(c)
    })
    return [...map.entries()]
  }, [filtered])

  // ── Guard: fiera non ancora caricata ─────────────────────────────────────
  if (!fiera) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Caricamento...</p>
          <button onClick={() => navigate('/')} className="mt-3 text-wine-600 underline text-sm">
            Torna alla home
          </button>
        </div>
      </div>
    )
  }

  function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvMapperFile(file)   // apre CSVMapper
    e.target.value = ''
  }

  async function handleCSVConfirm(nuoviContatti) {
    setCsvMapperFile(null)
    try {
      await updateFieraContatti(fiera.id, nuoviContatti)
      setRefreshKey(k => k + 1)
    } catch {
      alert('Errore nel salvataggio dei contatti')
    }
  }

  const activeFiltersCount = [
    riferimentoFiltro !== 'tutti',
    padiglioneF !== 'tutti',
    soloConAppt,
    sortKey !== 'giorno-ora-imp',
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-wine-700 text-white px-4 pt-12 pb-4 safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-wine-600 flex items-center justify-center active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate leading-tight">{fiera.nome}</h1>
            {fiera.luogo && <p className="text-wine-200 text-xs">{fiera.luogo}</p>}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 bg-wine-600 text-white text-xs px-3 py-2 rounded-xl font-medium"
          >
            <Upload className="w-4 h-4" />
            CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca azienda, stand, regione..."
            className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filtri giorno + padiglione (scroll orizzontale) */}
      {contatti.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <FilterChip label="Tutti i giorni" active={giornoFiltro === 'tutti'} onClick={() => setGiornoFiltro('tutti')} />
          {giorni.map(g => (
            <FilterChip key={g} label={`Giorno ${g}`} active={String(giornoFiltro) === String(g)} onClick={() => setGiornoFiltro(g)} />
          ))}
          <div className="w-px bg-gray-200 flex-shrink-0 mx-1" />
          {padiglioni.map(p => (
            <FilterChip key={p} label={p} active={padiglioneF === p} onClick={() => setPadiglioneF(padiglioneF === p ? 'tutti' : p)} />
          ))}
          <div className="w-px bg-gray-200 flex-shrink-0 mx-1" />
          <button
            onClick={() => setShowFilters(true)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeFiltersCount > 0
                ? 'bg-wine-700 text-white border-wine-700'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFiltersCount > 0 ? activeFiltersCount : 'Filtri'}
          </button>
        </div>
      )}

      {/* Conteggio risultati */}
      {contatti.length > 0 && (
        <div className="px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
          <span>{filtered.length} di {contatti.length} contatti</span>
          {filtered.filter(c => c.visitato).length > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {filtered.filter(c => c.visitato).length} visitati
            </span>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="px-4 pb-24 max-w-lg mx-auto">
        {contatti.length === 0 ? (
          <div className="text-center py-16">
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Nessun contatto caricato</p>
            <p className="text-sm text-gray-400 mb-4">Carica un CSV per vedere gli appuntamenti</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 bg-wine-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Carica CSV
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Nessun risultato per i filtri selezionati</p>
            <button
              onClick={() => { setGiornoFiltro('tutti'); setRiferimentoFiltro('tutti'); setPadiglioneF('tutti'); setSoloConAppt(false) }}
              className="mt-2 text-wine-600 text-sm underline"
            >
              Azzera filtri
            </button>
          </div>
        ) : (
          grouped.map(([day, contacts]) => (
            <div key={day} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-wine-600" />
                <h2 className="text-sm font-bold text-gray-700">{day}</h2>
                <span className="text-xs text-gray-400">({contacts.length})</span>
                {contacts.filter(c => c.visitato).length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium ml-auto">
                    {contacts.filter(c => c.visitato).length}/{contacts.length} visitati
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {contacts.map(c => (
                  <AppuntamentoCard key={c.id} contatto={c} fieraId={fiera.id} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB — Aggiungi contatto freddo */}
      <button
        onClick={() => setShowFreddoForm(true)}
        className="fixed bottom-6 right-4 z-40 w-14 h-14 bg-wine-700 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        title="Aggiungi contatto a freddo"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal — Contatto A Freddo */}
      {showFreddoForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFreddoForm(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 safe-bottom max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-wine-700" />
                <h3 className="font-bold text-gray-900">Contatto A Freddo</h3>
              </div>
              <button onClick={() => setShowFreddoForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">Contatti fuori lista che visiterai spontaneamente in fiera.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Azienda</label>
                <input
                  type="text"
                  value={freddoForm.azienda}
                  onChange={e => setFreddoForm(f => ({ ...f, azienda: e.target.value }))}
                  placeholder="Nome azienda"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-400"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={freddoForm.nome}
                    onChange={e => setFreddoForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cognome</label>
                  <input
                    type="text"
                    value={freddoForm.cognome}
                    onChange={e => setFreddoForm(f => ({ ...f, cognome: e.target.value }))}
                    placeholder="Cognome"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Stand / Padiglione</label>
                  <input
                    type="text"
                    value={freddoForm.posizione}
                    onChange={e => setFreddoForm(f => ({ ...f, posizione: e.target.value }))}
                    placeholder="Es. A4-123"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Telefono</label>
                  <input
                    type="tel"
                    value={freddoForm.telefono}
                    onChange={e => setFreddoForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+39..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Referente</label>
                <div className="flex gap-2 flex-wrap">
                  {['Fabio', 'Alessio', 'Rosy', 'BV'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFreddoForm(f => ({ ...f, riferimento: f.riferimento === r ? '' : r }))}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        freddoForm.riferimento === r
                          ? 'bg-wine-700 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Note iniziali</label>
                <textarea
                  value={freddoForm.note}
                  onChange={e => setFreddoForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Motivo del contatto, prodotti di interesse..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setFreddoForm(FREDDO_EMPTY); setShowFreddoForm(false) }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleAddFreddo}
                disabled={!freddoForm.nome && !freddoForm.azienda}
                className={`flex-2 flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${
                  savedFreddo ? 'bg-green-500 text-white' : 'bg-wine-700 text-white'
                }`}
              >
                {savedFreddo ? '✓ Aggiunto!' : <><UserPlus className="w-4 h-4" /> Aggiungi</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSVMapper: associazione colonne */}
      {csvMapperFile && (
        <CSVMapper
          file={csvMapperFile}
          onConfirm={handleCSVConfirm}
          onCancel={() => setCsvMapperFile(null)}
        />
      )}

      {/* Pannello filtri avanzati */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 safe-bottom max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Filtri avanzati</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Referente */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Referente</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Tutti" active={riferimentoFiltro === 'tutti'} onClick={() => setRiferimentoFiltro('tutti')} />
                  {riferimenti.map(r => (
                    <FilterChip key={r} label={r} active={riferimentoFiltro === r} onClick={() => setRiferimentoFiltro(r)} />
                  ))}
                </div>
              </div>

              {/* Ordinamento */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Ordinamento</p>
                <div className="space-y-2">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSortKey(opt.key)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                        sortKey === opt.key
                          ? 'border-wine-400 bg-wine-50 text-wine-700 font-medium'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solo con appuntamento */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Visualizzazione</p>
                <button
                  onClick={() => setSoloConAppt(v => !v)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-colors ${
                    soloConAppt ? 'border-wine-400 bg-wine-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    soloConAppt ? 'bg-wine-700 border-wine-700' : 'border-gray-300'
                  }`}>
                    {soloConAppt && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-gray-700">Solo con appuntamento fissato</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setRiferimentoFiltro('tutti')
                setSoloConAppt(false)
                setSortKey('giorno-ora-imp')
                setShowFilters(false)
              }}
              className="w-full mt-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
            >
              Azzera filtri
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
