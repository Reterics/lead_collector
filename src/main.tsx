import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './i18n';
import { BrowserRouter } from 'react-router-dom';

const baseName = import.meta.env.DEV
  ? '/'
  : import.meta.env.VITE_BASENAME || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={baseName}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
