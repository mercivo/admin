import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

localStorage.removeItem('mercivo_locale');
document.documentElement.lang = 'zh-CN';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
