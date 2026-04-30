import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import FieraDetail from './pages/FieraDetail'
import ContattoDetail from './pages/ContattoDetail'
import Oggi from './pages/Oggi'
import Mappa from './pages/Mappa'
import BottomNav from './components/BottomNav'
import { UserProvider } from './context/UserContext'
import { useFiere } from './hooks/useFiere'

// Pagine che NON mostrano la bottom nav (pagine "deep")
const NO_NAV = ['/fiera']

// Importa automaticamente una fiera da ?setup=BASE64 nell'URL
function SetupImporter() {
  const { addFiera, fiere } = useFiere()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setup = params.get('setup')
    if (!setup) return
    try {
      const config = JSON.parse(atob(setup))
      if (!config.nome) return
      // Non duplicare se esiste già una fiera con lo stesso nome
      if (fiere.some(f => f.nome === config.nome)) {
        navigate('/', { replace: true })
        return
      }
      addFiera({ ...config, contatti: [] }).then(() => {
        navigate('/', { replace: true })
      })
    } catch (e) { console.error('Setup import error', e) }
  }, [fiere.length])   // aspetta che fiere sia caricata

  return null
}

function AppRoutes() {
  const location = useLocation()
  const showNav = !NO_NAV.some(prefix => location.pathname.startsWith(prefix))

  return (
    <>
      <SetupImporter />
      <div className={showNav ? 'pb-16' : ''}>
        <Routes>
          <Route path="/"                               element={<Home />} />
          <Route path="/oggi"                           element={<Oggi />} />
          <Route path="/mappa"                          element={<Mappa />} />
          <Route path="/fiera/:id"                      element={<FieraDetail />} />
          <Route path="/fiera/:id/contatto/:cid"        element={<ContattoDetail />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  )
}
