import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import FeedApp from './pages/FeedApp'
import Connect from './pages/Connect'
import { PwaProvider } from './components/pwa/PwaProvider'
import { PwaRuntime } from './components/pwa/PwaRuntime'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaProvider>
      <BrowserRouter>
        <PwaRuntime />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<FeedApp />} />
          <Route path="/connect" element={<Connect />} />
        </Routes>
      </BrowserRouter>
    </PwaProvider>
  </StrictMode>,
)
