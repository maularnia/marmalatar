import { CSSVar } from '@src/theme/utils';
import { folder } from '@src/services/folder';
import Button from '@ui-toolkit/Button/Button';
import { TIcon } from '@ui-toolkit/Icon/icons';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { TButtonVariant } from '../Button/types';
import RescanButton from './RescanButton';
const Root = styled.div`
  display: flex;
  gap: ${CSSVar('formSpacingInnerX')};
`;

export default function SelectFolderButton({ ref }: { ref?: Ref<HTMLButtonElement> }) {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();

  const handleSelectFolder = async () => {
    const didPickFolder = await folder.pick();
    if (didPickFolder) navigate('/');
  };

  return (
    <>
      <Root>
        <Button
          ref={ref}
          style={{ justifySelf: 'flex-start' }}
          type="button"
          variant={TButtonVariant.SPECIAL}
          icon={TIcon.FOLDER_FAVORITE}
          onClick={() => void handleSelectFolder()}
        >
          {t('workingFolder.selectButton')}
        </Button>
        <RescanButton />
      </Root>
    </>
  );
}
