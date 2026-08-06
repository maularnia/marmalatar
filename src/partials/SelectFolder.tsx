import { FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import RescanButton from '@ui-toolkit/SelectFolderButton/RescanButton';
import SelectFolderButton from '@ui-toolkit/SelectFolderButton/SelectFolderButton';
import { useTranslation } from 'react-i18next';

export default function SelectFolder() {
  const { t } = useTranslation('settings');

  return (
    <FormsSection>
      <FormsSectionTitle icon={TIcon.FOLDER_FAVORITE} subtext={t('workingFolder.subtext')}>
        {t('workingFolder.title')}
      </FormsSectionTitle>
      <FormsSectionContent>
        <SelectFolderButton />
      </FormsSectionContent>
      <FormsSectionContent>
        <RescanButton />
      </FormsSectionContent>
    </FormsSection>
  );
}
