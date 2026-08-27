import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')

if (!root) {
  throw new Error('root element not found')
}
createRoot(root).render(
  <App />
)
