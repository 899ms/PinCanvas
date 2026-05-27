import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { importRuntimeConfigFromUrl } from './store/urlRuntimeConfig';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

importRuntimeConfigFromUrl();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
