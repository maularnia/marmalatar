import { useMessageHelmet } from '@providers/MessageHelmetProvider';
import { emitCacheCleanupFailedMessage, emitCacheCleanupSuccessMessage } from '@src/messages';
import { useLoader } from '@src/segments/dialogs/loader/useLoader';
import { workingFolder } from '@store/slices/workingFolder';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';

export default function CleanCache() {
  const { t } = useTranslation('settings');
  const { pushMessage } = useMessageHelmet();
  const { load } = useLoader();

  const handleClean = async () => {
    try {
      await load({ messages: [] }, workingFolder.cleanupMediaCache());
      emitCacheCleanupSuccessMessage(pushMessage);
    } catch {
      emitCacheCleanupFailedMessage(pushMessage);
    }
  };

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
          onClick={() => void handleClean()}
        >
          {t('mediaCache.cleanButton')}
        </Button>
      </FormsSectionContent>
    </FormsSection>
  );
}
