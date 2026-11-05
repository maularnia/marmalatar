import PromptSetupRow from '@src/partials/PromptSetup';
import { settings } from '@src/store/slices/settings';
import { useAppSelector } from '@store/hooks';
import { ai } from '@src/services/ai';
import { FormRoot, FormsContent } from '@ui-toolkit/forms';

export default function AiTranslationStatusPanel() {
  const aiTranslationEnabled = useAppSelector(settings.selectAIintegrationEnabled);
  const connected = useAppSelector(ai.selectIntegrationConnected);
  const pingError = useAppSelector(ai.selectIntegrationPingError);
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
