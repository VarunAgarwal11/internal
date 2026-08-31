import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import './index.css'
import App from './App.jsx'

// No ThemeProvider: an internal ops tool does not need a colour picker, and the one in
// the neighbouring portal exists to let clinics match their branding — nobody outside
// this company ever sees this screen.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
