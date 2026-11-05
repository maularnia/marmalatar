import { configureStore } from '@reduxjs/toolkit';
import { Service } from '@src/services/Service';
import { rootReducer } from './root';
import { persistProjectStateMiddleware } from './persistProjectState';
import { persistEditorStateMiddleware } from './persistEditorState';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(
      persistProjectStateMiddleware.middleware,
      persistEditorStateMiddleware.middleware
    ),
});

// Facade actions and thunks dispatch on this store, and their `get` readers read it
Service.connect(store);
