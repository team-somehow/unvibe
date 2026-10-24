import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import FeedApp from './pages/FeedApp'
import Connect from './pages/Connect'
import { PwaProvider } from './components/pwa/PwaProvider'
import { isStandalone } from './components/pwa/usePwaInstall'
import { PwaRuntime } from './components/pwa/PwaRuntime'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaProvider>
      <BrowserRouter>
        <PwaRuntime />
        <Routes>
          {/* the installed app is only the feed; the landing page stays in the browser */}
          <Route path="/" element={isStandalone() ? <Navigate to="/app" replace /> : <Landing />} />
          <Route path="/app" element={<FeedApp />} />
          <Route path="/connect" element={<Connect />} />
        </Routes>
      </BrowserRouter>
    </PwaProvider>
  </StrictMode>,
)
