import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

async function prepare() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser.js');
    return worker.start({
      onUnhandledRequest: 'bypass', // don't warn for Google Fonts, etc.
    });
  }
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
