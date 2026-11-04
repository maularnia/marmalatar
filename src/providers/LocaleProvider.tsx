import { PropsWithChildren, useEffect } from 'react';
import { useAppSelector } from '@store/hooks';
import { settings } from '@store/slices/settings';
import i18n from '@src/i18n';

export function LocaleProvider({ children }: PropsWithChildren) {
  const uiLocale = useAppSelector(settings.selectUiLocale);

  useEffect(() => {
    void i18n.changeLanguage(uiLocale);
  }, [uiLocale]);

  return children;
}
