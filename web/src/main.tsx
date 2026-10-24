import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')

if (!root) {
  throw new Error('root element not found')
}
createRoot(root).render(
  // BrowserRouter makes the url of the browser drive which
  // screen App shows, and keeps the url in sync when the
  // player moves between screens
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
