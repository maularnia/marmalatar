import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { UI_LOCALE_DEFAULT } from '@src/consts';
import en from './locales/en';
import be from './locales/be';
import beLatn from './locales/be-Latn';

void i18n.use(initReactI18next).init({
  resources: { en, be, 'be-Latn': beLatn },
  ns: Object.keys(en),
  defaultNS: 'app',
  lng: UI_LOCALE_DEFAULT,
  fallbackLng: UI_LOCALE_DEFAULT,
  interpolation: { escapeValue: false },
});

export default i18n;
