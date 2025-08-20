import React from 'react';
import ReactDOM from 'react-dom';
import './i18n';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './components/AuthContext';
import { GlobalProvider } from './components/GlobalContext';

ReactDOM.render(
  <BrowserRouter>
    <AuthProvider>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </AuthProvider>
  </BrowserRouter>,
  document.getElementById('root')
);