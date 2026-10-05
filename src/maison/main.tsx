import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Maison from './Maison'
import './maison.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Maison />
  </StrictMode>,
)
