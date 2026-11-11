import { GlobalDictionaries } from '@src/partials/GlobalDictionaries';
import { ProjectDictionaries } from '@src/partials/ProjectDictionaries';
import { settings } from '@src/services/settings';
import { spellcheck } from '@src/services/spellcheck';
import { useAppSelectors } from '@store/hooks';
import { TButtonSize } from '@ui-toolkit/Button/types';
import { FormsRow, FormsSection, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { TabContent, Tabs } from '@ui-toolkit/Tabs';
import Toggle from '@ui-toolkit/Toggle';
import { useTranslation } from 'react-i18next';

/** The spellchecker's settings, shown in the Settings overlay and next to the editor: whether it
 * runs, and while it does, the user dictionaries' words -- the global ones, and the open project's
 * (its tab only while a project is open and its dictionaries have words) */
export function SpellcheckSettings() {
  const { t } = useTranslation('settings');
  const [checkGrammar, projectDictionaries] = useAppSelectors(
    settings.selectCheckGrammar,
    spellcheck.selectProjectDictionariesWithWords
  );
  const hasProjectWords = Object.keys(projectDictionaries).length > 0;

  return (
    <>
      <FormsRow>
        <FormsSection>
          {/* The switch sits in the title, as the AI integration's does */}
          <FormsSectionTitle
            icon={TIcon.SPELLCHECK}
            after={
              <Toggle
                checked={checkGrammar}
                aria-label={t('spellcheck.checkGrammar')}
                onChange={(e) => settings.setCheckGrammar(e.currentTarget.checked)}
              />
            }
          >
            {t('spellcheck.title')}
          </FormsSectionTitle>
        </FormsSection>
      </FormsRow>
      {/* The dictionaries only matter while the spellchecker runs */}
      {checkGrammar && (
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
      )}
    </>
  );
}
