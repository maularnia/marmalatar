import { useAppSelector } from '@src/store/hooks';
import { selectFolder } from '@src/store/slices/disc';
import { ThemeColors } from '@src/theme/utils';
import Message, { TMessageSize, TMessageVariant } from '@src/toolkit/Message';
import { FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import SelectFolderButton from '@ui-toolkit/SelectFolderButton/SelectFolderButton';
import { useTranslation } from 'react-i18next';

export default function SelectFolder() {
  const { t } = useTranslation('settings');
  const folder = useAppSelector(selectFolder);
  return (
    <FormsSection>
      <FormsSectionTitle icon={TIcon.FOLDER_FAVORITE} subtext={<>{t('workingFolder.subtext')}</>}>
        {t('workingFolder.title')}
      </FormsSectionTitle>
      <FormsSectionContent>
        <SelectFolderButton />
      </FormsSectionContent>
      <FormsSectionContent>
        {folder && (
          <Message size={TMessageSize.XS} color={ThemeColors.TEXT} type={TMessageVariant.SECONDARY}>
            {t('workingFolder.currentFolder', { folder })}
          </Message>
        )}
      </FormsSectionContent>
    </FormsSection>
  );
}
