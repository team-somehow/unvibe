import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import FeedApp from './pages/FeedApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<FeedApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
