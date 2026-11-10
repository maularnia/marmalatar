import { settings } from '@src/services/settings';
import { CSSVar } from '@src/theme/utils';
import { FormRoot } from '@ui-toolkit/forms';
import { TabContent, Tabs } from '@ui-toolkit/Tabs';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import Overlay from '../Overlay';
import { AiTab } from './AiTab';
import { GeneralTab } from './GeneralTab';
import { SpellcheckTab } from './SpellcheckTab';

// The tab bar lines up with the form rows below it, which carry their own side padding
const SettingsTabs = styled.div`
  [role='tablist'] {
    padding: 0 ${CSSVar('formSpacingX')};
  }
`;

export default function SettingsOverlay() {
  const { t } = useTranslation('settings');
  return (
    <Overlay title={t('overlayTitle')} onClose={() => settings.close()}>
      <FormRoot onSubmit={(e) => e.preventDefault()}>
        <SettingsTabs>
          <Tabs
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
        </SettingsTabs>
      </FormRoot>
    </Overlay>
  );
}
