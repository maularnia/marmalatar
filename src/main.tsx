import { ConfirmationProvider } from '@providers/ConfirmationProvider/ConfirmationProvider';
import GlobalKeystrokeDispatcher from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import PopperPortalProvider from '@providers/PopperPortalProvider';
import VideoProvider from '@providers/VideoProvider';
import i18n from '@src/i18n';
import AppErrorBoundary from '@src/layout/components/AppErrorBoundary';
import LocaleProvider from '@src/providers/LocaleProvider';
import ThemeProvider from '@src/providers/ThemeProvider';
import { hydrateAppSettings } from '@src/store/slices/app';
import { parseAppSettings } from '@src/utils/appSettingsFile';
import { initializeAiIntegration } from '@store/slices/aiTranslation';
import { initDisc } from '@store/slices/disc';
import { store } from '@store/store';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import './assets/index.css';
import './assets/variables.css';
import MessageHelmet from './providers/MessageHelmetProvider';
import { MainMenuStateContextProvider } from './providers/MenuStateProvider';

// Resolve persisted settings before mounting
window.electronAPI.getAppSettings().then((raw) => {
  const settings = parseAppSettings(raw);
  store.dispatch(hydrateAppSettings(settings));
  void i18n.changeLanguage(settings.uiLocale);
  if (JSON.stringify(raw) !== JSON.stringify(settings)) {
    void window.electronAPI.setAppSettings(settings);
  }

  void store.dispatch(initDisc());
  void store.dispatch(initializeAiIntegration()).catch(() => {});

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <MemoryRouter>
          <Provider store={store}>
            <LocaleProvider>
              <ThemeProvider>
                <MainMenuStateContextProvider>
                  <PopperPortalProvider>
                    <GlobalKeystrokeDispatcher>
                      <ConfirmationProvider>
                        <MessageHelmet>
                          <VideoProvider>
                            <App />
                          </VideoProvider>
                        </MessageHelmet>
                      </ConfirmationProvider>
                    </GlobalKeystrokeDispatcher>
                  </PopperPortalProvider>
                </MainMenuStateContextProvider>
              </ThemeProvider>
            </LocaleProvider>
          </Provider>
        </MemoryRouter>
      </AppErrorBoundary>
    </React.StrictMode>
  );
});
