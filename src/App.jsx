import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import FieraDetail from './pages/FieraDetail'
import ContattoDetail from './pages/ContattoDetail'
import Oggi from './pages/Oggi'
import Mappa from './pages/Mappa'
import BottomNav from './components/BottomNav'
import { UserProvider } from './context/UserContext'

// Pagine che NON mostrano la bottom nav (pagine "deep")
const NO_NAV = ['/fiera']

function AppRoutes() {
  const location = useLocation()
  const showNav = !NO_NAV.some(prefix => location.pathname.startsWith(prefix))

  return (
    <>
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
