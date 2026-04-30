import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { X, CheckCircle2, AlertTriangle, Upload, ChevronDown } from 'lucide-react'
import { FIELD_MAP, APP_FIELDS, applyMapping } from '../utils/csvParser'

/**
 * CSVMapper: modal per associare le colonne del CSV ai campi interni dell'app.
 *
 * Props:
 *   file     — File object caricato dall'utente
 *   onConfirm(contacts) — chiamato con i contatti mappati pronti per il salvataggio
 *   onCancel()          — chiamato quando l'utente annulla
 */
export default function CSVMapper({ file, onConfirm, onCancel }) {
  const [headers, setHeaders] = useState([])
  const [rows,    setRows]    = useState([])
  const [mapping, setMapping] = useState({})   // { csvCol: appField | '' }
  const [loading, setLoading] = useState(true)

  // Parsing CSV al mount
  useEffect(() => {
    if (!file) return
    setLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const hdrs = results.meta.fields || []
        setHeaders(hdrs)
        setRows(results.data)

        // Auto-mapping iniziale usando FIELD_MAP
        const m = {}
        hdrs.forEach(h => {
          m[h] = FIELD_MAP[h] || ''
        })
        setMapping(m)
        setLoading(false)
      },
      error: () => setLoading(false),
    })
  }, [file])

  function handleConfirm() {
    const contacts = applyMapping(rows, mapping)
    onConfirm(contacts)
  }

  const unmappedCount = Object.values(mapping).filter(v => !v).length
  const mappedCount   = Object.values(mapping).filter(v => !!v).length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Associa colonne CSV</h2>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">
                {rows.length} contatti · {headers.length} colonne rilevate
              </p>
            )}
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Riepilogo stato */}
        {!loading && (
          <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-semibold text-green-700">{mappedCount} associate</span>
            </div>
            {unmappedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">{unmappedCount} non associate</span>
              </div>
            )}
          </div>
        )}

        {/* Separatore */}
        <div className="border-t border-gray-100 flex-shrink-0" />

        {/* Lista colonne */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Analisi del file CSV...
            </div>
          ) : headers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nessuna colonna rilevata nel CSV
            </div>
          ) : (
            headers.map(h => {
              const mapped = !!mapping[h]
              return (
                <div
                  key={h}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                    mapped ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-100'
                  }`}
                >
                  {/* Colonna CSV */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-gray-700 truncate">{h}</p>
                    {rows[0]?.[h] && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        es: {String(rows[0][h]).slice(0, 40)}
                      </p>
                    )}
                  </div>

                  {/* Freccia */}
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 ${mapped ? 'text-green-400' : 'text-amber-400'}`} />

                  {/* Dropdown campo app */}
                  <select
                    value={mapping[h] || ''}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className={`text-xs rounded-xl border px-2 py-2 pr-6 appearance-none focus:outline-none focus:ring-2 flex-shrink-0 max-w-[140px] ${
                      mapped
                        ? 'border-gray-200 text-gray-800 bg-gray-50 focus:ring-wine-400'
                        : 'border-amber-300 text-amber-700 bg-amber-50 focus:ring-amber-400'
                    }`}
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="">— Ignora —</option>
                    {APP_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={rows.length === 0}
              className="flex-2 flex-1 py-3 rounded-xl bg-wine-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              <Upload className="w-4 h-4" />
              Importa {rows.length} contatti
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
