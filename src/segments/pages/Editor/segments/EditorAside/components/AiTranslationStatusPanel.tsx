import PromptSetupRow from '@src/partials/PromptSetup';
import { settings } from '@src/services/settings';
import { useAppSelectors } from '@store/hooks';
import { ai } from '@src/services/ai';
import { FormRoot, FormsContent } from '@ui-toolkit/forms';

export default function AiTranslationStatusPanel() {
  const [aiTranslationEnabled, connected, pingError] = useAppSelectors(
    settings.selectAIintegrationEnabled,
    ai.selectIntegrationConnected,
    ai.selectIntegrationPingError
  );
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
