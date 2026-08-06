import { PropsWithChildren, useEffect } from 'react';
import { useAppSelector } from '@store/hooks';
import { selectUiLocale } from '@store/slices/app';
import i18n from '@src/i18n';

export default function LocaleProvider({ children }: PropsWithChildren) {
  const uiLocale = useAppSelector(selectUiLocale);

  useEffect(() => {
    void i18n.changeLanguage(uiLocale);
  }, [uiLocale]);

  return children;
}
