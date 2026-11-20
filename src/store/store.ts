import { configureStore } from '@reduxjs/toolkit';
import { Service } from '@src/services/Service';
import { rootReducer } from './root';
import { projectAutosaveMiddleware } from '@src/services/project';
import { settingsPersistMiddleware } from '@src/services/settings';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(
      projectAutosaveMiddleware.middleware,
      settingsPersistMiddleware.middleware
    ),
});

// Facade actions and thunks dispatch on this store, and their `get` readers read it
Service.connect(store);
