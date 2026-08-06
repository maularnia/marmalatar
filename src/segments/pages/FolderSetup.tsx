import { ThemeColors } from '@src/theme/utils';
import { appearUpSpringSlow } from '@src/toolkit/motion/transitions';
import { useAutoFocusFirst } from '@src/utils/getFocusableElements';
import {
  FormRoot,
  FormsContent,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import SelectFolderButton from '@ui-toolkit/SelectFolderButton/SelectFolderButton';
import Span from '@ui-toolkit/Span';
import { useRef } from 'react';

export default function FolderSetup() {
  const rootRef = useRef<HTMLFormElement>(null);
  useAutoFocusFirst(rootRef);
  return (
    <FormRoot ref={rootRef} style={{ alignSelf: 'center' }} onSubmit={(e) => e.preventDefault()}>
      <FormsContent {...appearUpSpringSlow}>
        <FormsRow>
          <FormsSection>
            <FormsSectionTitle
              icon={TIcon.FOLDER_FAVORITE}
              subtext={
                <>
                  <Span color={ThemeColors.ACCENT1} bold>
                    Select a folder
                  </Span>{' '}
                  where you projects will be stored
                </>
              }
            >
              One thing before we start...
            </FormsSectionTitle>
            <FormsSectionContent>
              <SelectFolderButton />
            </FormsSectionContent>
          </FormsSection>
        </FormsRow>
      </FormsContent>
    </FormRoot>
  );
}
