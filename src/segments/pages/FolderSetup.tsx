import { ThemeColors } from '@src/theme/utils';
import { appearUpSpringSlow } from '@src/toolkit/motion/transitions';
import { useStealFocus } from '@src/utils/getFocusableElements';
import {
  FormRoot,
  FormsContent,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
  FormTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import SelectFolderButton from '@ui-toolkit/SelectFolderButton/SelectFolderButton';
import Span from '@ui-toolkit/Span';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function FolderSetup() {
  const { t } = useTranslation('home');
  const selectButtonRef = useRef<HTMLButtonElement>(null);
  useStealFocus(selectButtonRef);
  return (
    <FormRoot style={{ alignSelf: 'center' }} onSubmit={(e) => e.preventDefault()}>
      <FormTitle>{t('folderSetup.title')}</FormTitle>
      <FormsContent {...appearUpSpringSlow}>
        <FormsRow>
          <FormsSection>
            <FormsSectionTitle
              icon={TIcon.FOLDER_FAVORITE}
              subtext={
                <>
                  <Span color={ThemeColors.ACCENT1} bold>
                    {t('folderSetup.subtextHighlight')}
                  </Span>{' '}
                  {t('folderSetup.subtextRest')}
                </>
              }
            >
              {t('folderSetup.sectionTitle')}
            </FormsSectionTitle>
            <FormsSectionContent>
              <SelectFolderButton ref={selectButtonRef} />
            </FormsSectionContent>
          </FormsSection>
        </FormsRow>
      </FormsContent>
    </FormRoot>
  );
}
