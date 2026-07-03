import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// One-time clean up of all user accounts on the client-side
if (!localStorage.getItem('moneymind_accounts_cleared_v1')) {
  localStorage.removeItem('moneymind_users');
  localStorage.removeItem('moneymind_session');
  localStorage.setItem('moneymind_accounts_cleared_v1', 'true');
}

// Global Fetch Interceptor for User-Specific Database Separation
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
  const userEmail = session.email;
  
  if (userEmail && typeof url === 'string' && url.startsWith('/api/')) {
    if (!options.headers) {
      options.headers = {};
    }
    if (options.headers instanceof Headers) {
      options.headers.set('X-User-Email', userEmail);
    } else if (Array.isArray(options.headers)) {
      options.headers.push(['X-User-Email', userEmail]);
    } else {
      options.headers['X-User-Email'] = userEmail;
    }
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

