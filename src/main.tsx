import { ConfirmationProvider } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { GlobalKeystrokeDispatcher } from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import { PopperPortalProvider } from '@providers/PopperPortalProvider';
import { NavigationBridge } from '@providers/bridges/NavigationBridge';
import AppErrorBoundary from '@src/layout/components/AppErrorBoundary';
import { LocaleProvider } from '@src/providers/LocaleProvider';
import { ThemeProvider } from '@src/providers/ThemeProvider';
import { ai } from '@src/services/ai';
import { folder } from '@src/services/folder';
import { settings } from '@src/services/settings';
import { store } from '@store/store';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import './assets/index.css';
import './assets/variables.css';
import { MessageHelmetProvider } from './providers/MessageHelmetProvider';

// Startup. Settings are awaited, so the first render already has the theme and language; the
// folder's lists (from the main process's cached listing, no live scan) and the AI integration
// load in the background.
async function hydrate(): Promise<void> {
  await settings.load();
  void folder.loadTracked();
  void ai.initializeAiIntegration().catch(() => {});
}

void hydrate().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <MemoryRouter>
          <NavigationBridge />
          <Provider store={store}>
            <MessageHelmetProvider>
              <LocaleProvider>
                <ThemeProvider>
                  <PopperPortalProvider>
                    <GlobalKeystrokeDispatcher>
                      <ConfirmationProvider>
                        <App />
                      </ConfirmationProvider>
                    </GlobalKeystrokeDispatcher>
                  </PopperPortalProvider>
                </ThemeProvider>
              </LocaleProvider>
            </MessageHelmetProvider>
          </Provider>
        </MemoryRouter>
      </AppErrorBoundary>
    </React.StrictMode>
  );
});
