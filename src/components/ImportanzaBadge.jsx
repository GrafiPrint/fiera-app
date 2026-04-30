const DOT_COLORS = [
  '',           // 0 - nessuno
  'bg-gray-400',   // 1
  'bg-blue-400',   // 2
  'bg-yellow-400', // 3
  'bg-orange-400', // 4
  'bg-red-500',    // 5
]

export default function ImportanzaBadge({ value, size = 'sm' }) {
  const n = typeof value === 'number' ? value : (String(value || '').match(/X/g) || []).length
  if (!n) return null
  const color = DOT_COLORS[n] || DOT_COLORS[1]
  const dotSize = size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`${dotSize} rounded-full ${i < n ? color : 'bg-gray-100'}`}
        />
      ))}
    </div>
  )
}
