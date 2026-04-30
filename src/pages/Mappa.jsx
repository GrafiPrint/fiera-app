import { useRef, useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MIN_SCALE = 0.5
const MAX_SCALE = 5
const MAPS = [
  { id: 'vinitaly', label: 'Mappa Quartiere', src: '/maps/mappa-vinitaly.jpg' },
]

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val))
}

function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getMidpoint(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

export default function Mappa() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const imgRef = useRef(null)

  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [mapIdx, setMapIdx] = useState(0)

  // Touch state
  const touch = useRef({
    isDragging: false,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    isPinching: false,
    startDist: 0,
    startScale: 1,
    startMid: { x: 0, y: 0 },
    startPos: { x: 0, y: 0 },
  })

  function resetView() {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }

  function zoom(factor) {
    setScale(s => clamp(s * factor, MIN_SCALE, MAX_SCALE))
  }

  // Mouse wheel zoom
  function onWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.85 : 1.18
    setScale(s => clamp(s * delta, MIN_SCALE, MAX_SCALE))
  }

  // Touch events
  function onTouchStart(e) {
    const t = touch.current
    if (e.touches.length === 1) {
      t.isDragging = true
      t.isPinching = false
      t.startX = e.touches[0].clientX - t.lastX
      t.startY = e.touches[0].clientY - t.lastY
    } else if (e.touches.length === 2) {
      t.isPinching = true
      t.isDragging = false
      t.startDist = getDistance(e.touches)
      t.startScale = scale
      t.startMid = getMidpoint(e.touches)
      t.startPos = { ...pos }
    }
  }

  function onTouchMove(e) {
    e.preventDefault()
    const t = touch.current
    if (t.isPinching && e.touches.length === 2) {
      const dist = getDistance(e.touches)
      const newScale = clamp(t.startScale * (dist / t.startDist), MIN_SCALE, MAX_SCALE)
      setScale(newScale)
    } else if (t.isDragging && e.touches.length === 1) {
      const newX = e.touches[0].clientX - t.startX
      const newY = e.touches[0].clientY - t.startY
      t.lastX = newX
      t.lastY = newY
      setPos({ x: newX, y: newY })
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) touch.current.isPinching = false
    if (e.touches.length === 0) touch.current.isDragging = false
  }

  // Mouse drag
  const mouse = useRef({ down: false, sx: 0, sy: 0, lastX: 0, lastY: 0 })

  function onMouseDown(e) {
    mouse.current.down = true
    mouse.current.sx = e.clientX - mouse.current.lastX
    mouse.current.sy = e.clientY - mouse.current.lastY
  }

  function onMouseMove(e) {
    if (!mouse.current.down) return
    const nx = e.clientX - mouse.current.sx
    const ny = e.clientY - mouse.current.sy
    mouse.current.lastX = nx
    mouse.current.lastY = ny
    setPos({ x: nx, y: ny })
  }

  function onMouseUp() {
    mouse.current.down = false
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [scale, pos])

  // Reset view quando cambia mappa
  useEffect(() => {
    resetView()
    touch.current.lastX = 0
    touch.current.lastY = 0
    mouse.current.lastX = 0
    mouse.current.lastY = 0
  }, [mapIdx])

  const map = MAPS[mapIdx]

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-wine-700 text-white px-4 pt-12 pb-3 safe-top flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg">Mappa Fiera</h1>
          <div className="flex gap-2">
            <button onClick={() => zoom(1.3)} className="w-9 h-9 bg-wine-600 rounded-xl flex items-center justify-center">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => zoom(0.77)} className="w-9 h-9 bg-wine-600 rounded-xl flex items-center justify-center">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={resetView} className="w-9 h-9 bg-wine-600 rounded-xl flex items-center justify-center">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab mappe */}
        {MAPS.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {MAPS.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setMapIdx(i)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mapIdx === i ? 'bg-white text-wine-700' : 'bg-wine-600 text-wine-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="bg-gray-800 text-gray-400 text-xs text-center py-1.5 flex-shrink-0">
        Usa due dita per zoomare · Trascina per spostarti
      </div>

      {/* Mappa */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-gray-900 cursor-grab active:cursor-grabbing select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'none',
          }}
        >
          <img
            ref={imgRef}
            src={map.src}
            alt={map.label}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Indicatore scala */}
        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  )
}
