import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { initTheme } from './lib/theme';
import './index.css';

initTheme();
// Service Worker: App offline verfügbar machen, Updates automatisch übernehmen.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
