import { ConfirmationProvider } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { GlobalKeystrokeDispatcher } from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import { PopperPortalProvider } from '@providers/PopperPortalProvider';
import { VideoProvider } from '@providers/VideoProvider';
import i18n from '@src/i18n';
import AppErrorBoundary from '@src/layout/components/AppErrorBoundary';
import { LocaleProvider } from '@src/providers/LocaleProvider';
import { ThemeProvider } from '@src/providers/ThemeProvider';
import { settings } from '@src/store/slices/settings';
import { parseAppSettings } from '@src/utils/appSettingsFile';
import { ai } from '@store/slices/ai';
import { initWorkingFolder } from '@store/thunks';
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
import { IPC } from '@src/services/ipc/IPC';

// Resolve persisted settings before mounting
IPC.settings.getAppSettings().then((raw) => {
  const persistedSettings = parseAppSettings(raw);
  store.dispatch(settings.hydrate(persistedSettings));
  void i18n.changeLanguage(persistedSettings.uiLocale);
  if (JSON.stringify(raw) !== JSON.stringify(persistedSettings)) {
    void IPC.settings.setAppSettings(persistedSettings);
  }

  void store.dispatch(initWorkingFolder());
  void store.dispatch(ai.initializeAiIntegration()).catch(() => {});

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
