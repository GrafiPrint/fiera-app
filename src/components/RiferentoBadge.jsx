const COLORS = {
  fabio:   'bg-purple-100 text-purple-700',
  alessio: 'bg-green-100 text-green-700',
  rosy:    'bg-pink-100 text-pink-700',
  bv:      'bg-blue-100 text-blue-700',
}

export default function RiferentoBadge({ name }) {
  if (!name) return null
  const key = name.toLowerCase().split(/[\s/]/)[0]
  const color = COLORS[key] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {name}
    </span>
  )
}
