import { media } from '@src/services/media';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';

export default function CleanCache() {
  const { t } = useTranslation('settings');

  return (
    <FormsSection>
      <FormsSectionTitle icon={TIcon.CLEANUP} subtext={t('mediaCache.subtext')}>
        {t('mediaCache.title')}
      </FormsSectionTitle>
      <FormsSectionContent>
        <Button
          type="button"
          variant={TButtonVariant.SECONDARY}
          icon={TIcon.CLEANUP}
          onClick={() => void media.cleanCache()}
        >
          {t('mediaCache.cleanButton')}
        </Button>
      </FormsSectionContent>
    </FormsSection>
  );
}
