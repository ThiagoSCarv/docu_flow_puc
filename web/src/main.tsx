// Ponto de entrada do Vite: carrega os estilos globais e monta o App no elemento #root.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Falha cedo e com mensagem clara se o index.html não tiver o contêiner esperado.
const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
