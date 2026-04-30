import { NavLink, useLocation } from 'react-router-dom'
import { Home, CalendarClock, Map } from 'lucide-react'

const TABS = [
  { to: '/',      icon: Home,          label: 'Fiere'  },
  { to: '/oggi',  icon: CalendarClock, label: 'Oggi'   },
  { to: '/mappa', icon: Map,           label: 'Mappa'  },
]

export default function BottomNav() {
  const location = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-wine-700' : 'text-gray-400'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-wine-700' : 'text-gray-400'}`}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
