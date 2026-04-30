import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, ChevronRight, CheckCircle2, Snowflake } from 'lucide-react'
import ImportanzaBadge from './ImportanzaBadge'
import RiferentoBadge from './RiferentoBadge'

export default function AppuntamentoCard({ contatto, fieraId }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/fiera/${fieraId}/contatto/${contatto.id}`)}
      className={`w-full text-left rounded-2xl shadow-sm border p-4 flex items-start gap-3 active:scale-[0.98] transition-transform ${
        contatto.visitato
          ? 'bg-green-50 border-green-200'
          : contatto.freddo
          ? 'bg-sky-50 border-sky-200'
          : 'bg-white border-gray-100'
      }`}
    >
      {/* Barra importanza laterale */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-1">
        <div
          className={`w-1.5 rounded-full ${
            contatto.importanzaNum >= 5 ? 'bg-red-500 h-12' :
            contatto.importanzaNum >= 4 ? 'bg-orange-400 h-10' :
            contatto.importanzaNum >= 3 ? 'bg-yellow-400 h-8' :
            contatto.importanzaNum >= 2 ? 'bg-blue-400 h-6' :
            'bg-gray-300 h-4'
          }`}
        />
      </div>

      {/* Contenuto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate leading-tight">
              {contatto.azienda || `${contatto.nome} ${contatto.cognome}`.trim()}
            </p>
            {contatto.azienda && (contatto.nome || contatto.cognome) && (
              <p className="text-xs text-gray-500 truncate">
                {contatto.nome} {contatto.cognome}
              </p>
            )}
          </div>
            {contatto.visitato ? (
            <div className="flex flex-col items-end gap-0.5">
              <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-green-500" />
              {contatto.visitatoDa && (
                <span className="text-[10px] font-semibold text-green-600 capitalize">
                  {contatto.visitatoDa}
                </span>
              )}
            </div>
          ) : (
            <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-300 mt-0.5" />
          )}
        </div>

        {/* Stand */}
        {contatto.posizione && (
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-wine-600 flex-shrink-0" />
            <span className="text-xs font-medium text-wine-700 truncate">{contatto.posizione}</span>
          </div>
        )}

        {/* Ora */}
        {contatto.ora && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-600">{contatto.ora}</span>
          </div>
        )}

        {/* Badge riga */}
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          <ImportanzaBadge value={contatto.importanzaNum} />
          {contatto.riferimento && <RiferentoBadge name={contatto.riferimento} />}
          {contatto.tag && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">
              {contatto.tag}
            </span>
          )}
          {contatto.freddo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-700 font-semibold">
              <Snowflake className="w-3 h-3" /> FREDDO
            </span>
          )}
          {contatto.regione && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
              {contatto.regione}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
