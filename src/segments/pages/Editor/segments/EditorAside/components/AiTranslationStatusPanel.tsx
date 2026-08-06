import PromptSetupRow from '@src/partials/PromptSetup';
import { selectAIintegrationEnabled } from '@src/store/slices/app';
import { useAppSelector } from '@store/hooks';
import {
  selectIntegrationConnected,
  selectIntegrationPingError,
} from '@store/slices/aiTranslation';
import { FormRoot, FormsContent } from '@ui-toolkit/forms';

export default function AiTranslationStatusPanel() {
  const aiTranslationEnabled = useAppSelector(selectAIintegrationEnabled);
  const connected = useAppSelector(selectIntegrationConnected);
  const pingError = useAppSelector(selectIntegrationPingError);
  const isReady = aiTranslationEnabled && connected && !pingError;

  if (isReady) {
    return (
      <FormRoot>
        <FormsContent>
          <PromptSetupRow />
        </FormsContent>
      </FormRoot>
    );
  }

  return null;
}
