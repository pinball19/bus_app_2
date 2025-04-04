import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import DriverList from './components/drivers/DriverList.jsx'
import DriverAdd from './components/drivers/DriverAdd.jsx'
import DriverDetail from './components/drivers/DriverDetail.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/drivers" element={<DriverList />} />
        <Route path="/drivers/add" element={<DriverAdd />} />
        <Route path="/drivers/:name" element={<DriverDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
