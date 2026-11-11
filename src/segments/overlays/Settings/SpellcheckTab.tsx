import { GlobalDictionaries } from '@src/partials/GlobalDictionaries';
import { ProjectDictionaries } from '@src/partials/ProjectDictionaries';
import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import { spellcheck } from '@src/services/spellcheck';
import { TButtonSize } from '@src/toolkit/Button/types';
import { TIcon } from '@src/toolkit/Icon/icons';
import { useAppSelector } from '@store/hooks';
import { FormsContent } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { TabContent, Tabs } from '@ui-toolkit/Tabs';
import { useTranslation } from 'react-i18next';

/** Whether the spellchecker runs, and the user dictionaries' words: the global ones, and the open
 * project's (its tab only while a project is open and its dictionaries have words) */
export function SpellcheckTab() {
  const { t } = useTranslation('settings');
  const projectDictionaries = useAppSelector(spellcheck.selectProjectDictionariesWithWords);
  const hasProjectWords = Object.keys(projectDictionaries).length > 0;

  return (
    <FormsContent>
      <SpellcheckSettings />
      <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
      <Tabs
        icon={TIcon.DICTIONARY}
        title={t('spellcheck.dictionaries')}
        tabSize={TButtonSize.SMALL}
        tabs={[
          { id: 'global', title: t('spellcheck.tabs.global'), default: true },
          { id: 'project', title: t('spellcheck.tabs.project') },
        ]}
      >
        <TabContent id="global">
          <GlobalDictionaries />
        </TabContent>
        {hasProjectWords && (
          <TabContent id="project">
            <ProjectDictionaries />
          </TabContent>
        )}
      </Tabs>
    </FormsContent>
  );
}
