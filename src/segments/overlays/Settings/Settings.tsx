import { projects } from '@src/services/project';
import { settings } from '@src/services/settings';
import { useAppSelector } from '@store/hooks';
import { FormRoot } from '@ui-toolkit/forms';
import { TabContent, Tabs } from '@ui-toolkit/Tabs';
import { useTranslation } from 'react-i18next';
import Overlay from '../Overlay';
import { AiTab } from './AiTab';
import { GeneralTab } from './GeneralTab';
import { ProjectTab } from './ProjectTab';
import { SpellcheckTab } from './SpellcheckTab';
import { TButtonSize } from '@src/toolkit/Button/types';

export default function SettingsOverlay() {
  const { t } = useTranslation('settings');
  // The project's own settings exist only while one is open; General is the first tab otherwise
  const isProjectOpen = useAppSelector(projects.selectIsOpen);
  return (
    <Overlay title={t('overlayTitle')} onClose={() => settings.close()}>
      <FormRoot onSubmit={(e) => e.preventDefault()}>
        <Tabs
          // Remounted if a project opens or closes, so the selected tab is picked again
          key={isProjectOpen ? 'project' : 'no-project'}
          tabSize={TButtonSize.REGULAR}
          tabs={[
            ...(isProjectOpen ? [{ id: 'project', title: t('tabs.project'), default: true }] : []),
            { id: 'general', title: t('tabs.general'), default: !isProjectOpen },
            { id: 'ai', title: t('tabs.ai') },
            { id: 'spellchecker', title: t('tabs.spellchecker') },
          ]}
        >
          {isProjectOpen && (
            <TabContent id="project">
              <ProjectTab />
            </TabContent>
          )}
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
