import { ConfirmationProvider } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { GlobalKeystrokeDispatcher } from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import { PopperPortalProvider } from '@providers/PopperPortalProvider';
import { VideoProvider } from '@providers/VideoProvider';
import AppErrorBoundary from '@src/layout/components/AppErrorBoundary';
import { LocaleProvider } from '@src/providers/LocaleProvider';
import { ThemeProvider } from '@src/providers/ThemeProvider';
import { hydrateApp } from '@store/thunks';
import { store } from '@store/store';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import './assets/index.css';
import './assets/variables.css';
import { MenuStateProvider } from './providers/MenuStateProvider';
import { MessageHelmetProvider } from './providers/MessageHelmetProvider';

// Resolve persisted settings before mounting
void store.dispatch(hydrateApp()).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <MemoryRouter>
          <Provider store={store}>
            <MessageHelmetProvider>
              <LocaleProvider>
                <ThemeProvider>
                  <MenuStateProvider>
                    <PopperPortalProvider>
                      <GlobalKeystrokeDispatcher>
                        <ConfirmationProvider>
                          <VideoProvider>
                            <App />
                          </VideoProvider>
                        </ConfirmationProvider>
                      </GlobalKeystrokeDispatcher>
                    </PopperPortalProvider>
                  </MenuStateProvider>
                </ThemeProvider>
              </LocaleProvider>
            </MessageHelmetProvider>
          </Provider>
        </MemoryRouter>
      </AppErrorBoundary>
    </React.StrictMode>
  );
});
