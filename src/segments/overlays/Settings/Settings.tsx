import { settings } from '@src/services/settings';
import { FormRoot } from '@ui-toolkit/forms';
import { TabContent, Tabs } from '@ui-toolkit/Tabs';
import { useTranslation } from 'react-i18next';
import Overlay from '../Overlay';
import { AiTab } from './AiTab';
import { GeneralTab } from './GeneralTab';
import { SpellcheckTab } from './SpellcheckTab';
import { TButtonSize } from '@src/toolkit/Button/types';

export default function SettingsOverlay() {
  const { t } = useTranslation('settings');
  return (
    <Overlay title={t('overlayTitle')} onClose={() => settings.close()}>
      <FormRoot onSubmit={(e) => e.preventDefault()}>
        <Tabs
          tabSize={TButtonSize.SMALL}
          tabs={[
            { id: 'general', title: t('tabs.general'), default: true },
            { id: 'ai', title: t('tabs.ai') },
            { id: 'spellchecker', title: t('tabs.spellchecker') },
          ]}
        >
          <TabContent id="general">
            <GeneralTab />
          </TabContent>
          <TabContent id="ai">
            <AiTab />
          </TabContent>
          <TabContent id="spellchecker">
            <SpellcheckTab />
          </TabContent>
        </Tabs>
      </FormRoot>
    </Overlay>
  );
}
