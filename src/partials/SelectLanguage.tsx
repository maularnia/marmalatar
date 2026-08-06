import {
  SUPPORTED_UI_LOCALES,
  UI_LOCALE_FLAGS,
  UI_LOCALE_LABELS,
  type TUiLocale,
} from '@src/i18n/locales';
import { selectUiLocale, setUiLocale } from '@src/store/slices/app';
import { TIcon } from '@src/toolkit/Icon/icons';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  FormSectionEntry,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import Select from '@ui-toolkit/Select/Select';
import { useTranslation } from 'react-i18next';

const UI_LOCALE_OPTIONS = SUPPORTED_UI_LOCALES.map((code) => ({
  value: code,
  label: UI_LOCALE_LABELS[code],
  emoji: UI_LOCALE_FLAGS[code],
}));

export default function SelectLanguage() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const uiLocale = useAppSelector(selectUiLocale);

  return (
    <FormsSection>
      <FormsSectionTitle icon={TIcon.LANGUAGE_INTERFACE}>{t('uxUi.appLanguage')}</FormsSectionTitle>
      <FormsSectionContent>
        <FormSectionEntry>
          <Select
            options={UI_LOCALE_OPTIONS}
            value={uiLocale}
            onChange={([v]) => dispatch(setUiLocale(v as TUiLocale))}
          />
        </FormSectionEntry>
      </FormsSectionContent>
    </FormsSection>
  );
}
