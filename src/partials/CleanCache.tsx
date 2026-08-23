import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { useMessageHelmet } from '@providers/MessageHelmetProvider';
import { emitCacheCleanupFailedMessage, emitCacheCleanupSuccessMessage } from '@src/messages';
import { Loader } from '@src/segments/dialogs/Loader';
import { cleanupMediaCache } from '@src/utils/data/discIO';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';

export default function CleanCache() {
  const { t } = useTranslation('settings');
  const { pushMessage } = useMessageHelmet();
  const { show: showLoading } = useInfoWindow(Loader);

  const handleClean = async () => {
    try {
      await showLoading({}, cleanupMediaCache());
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
