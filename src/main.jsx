import React from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config.js';
import './style.css';

const root = document.getElementById('root');

function showError(error) {
  if (!root) return;

  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'padding:24px;color:white;background:#10233f;min-height:100vh;direction:rtl;font-family:Arial;overflow-wrap:anywhere';
  const heading = document.createElement('h2');
  heading.textContent = 'برنامه با خطا روبه‌رو شد';
  const message = document.createElement('pre');
  message.style.whiteSpace = 'pre-wrap';
  message.textContent = String(error?.stack || error);
  box.append(heading, message);
  root.appendChild(box);
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('App error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: 'white', direction: 'rtl' }}>
          <h2>خطای برنامه</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

async function startApp() {
  try {
    const { default: App } = await import('./App.jsx');
    const queryClient = new QueryClient();

    createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </WagmiProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}sw.js`)
          .catch(console.error);
      });
    }
  } catch (error) {
    showError(error);
  }
}

startApp();
