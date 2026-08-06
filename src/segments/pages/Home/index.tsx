import { CSSVar } from '@src/theme/utils';
import { appearUpSpringSlow } from '@src/toolkit/motion/transitions';
import { useAutoFocusFirst } from '@src/utils/getFocusableElements';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { motion } from 'motion/react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Root = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 auto;
  gap: ${CSSVar('size24')};
`;
export default function Home() {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  useAutoFocusFirst(rootRef);
  return (
    <Root ref={rootRef} {...appearUpSpringSlow}>
      <Button
        onClick={() => navigate('/intro/import')}
        icon={TIcon.ADD_FILE}
        variant={TButtonVariant.SPECIAL}
        size={TButtonSize.REGULAR}
      >
        {t('createNewProjectButton')}
      </Button>
    </Root>
  );
}
