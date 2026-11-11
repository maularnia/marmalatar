import { settings } from '@src/services/settings';
import { useAppSelector } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Toggle from '@ui-toolkit/Toggle';
import { useTranslation } from 'react-i18next';

/** The spellchecker's settings: whether it runs at all */
export function SpellcheckSettings() {
  const { t } = useTranslation('settings');
  const checkGrammar = useAppSelector(settings.selectCheckGrammar);
  return (
    <FormsRow>
      <FormsSection>
        <FormsSectionTitle icon={TIcon.SPELLCHECK}>{t('spellcheck.title')}</FormsSectionTitle>
        <FormsSectionContent>
          <Toggle
            checked={checkGrammar}
            onChange={(e) => settings.setCheckGrammar(e.currentTarget.checked)}
          >
            {t('spellcheck.checkGrammar')}
          </Toggle>
        </FormsSectionContent>
      </FormsSection>
    </FormsRow>
  );
}
