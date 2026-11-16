import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import H from '@src/toolkit/H';
import P from '@src/toolkit/P';
import { flyInFromBelow } from '@src/toolkit/motion/transitions';
import { Logo } from '@ui-toolkit/Logo/Logo';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const AppTitleContainer = styled.div`
  display: flex;
  align-items: stretch;
  align-self: center;
  justify-self: center;
  flex-direction: column;
  position: absolute;
  bottom: 100%;
  margin-bottom: ${CSSVar('size34')};
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
`;

const LogoWrapper = styled.div`
  display: inline-flex;
  align-self: center;
  align-items: center;
  gap: ${CSSVar('size10')};
  color: ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)};
  padding-bottom: ${CSSVar('size24')};
`;

const LogoText = styled(H)`
  line-height: 82% !important;
`;
export const AppTitle = () => {
  const { t } = useTranslation('app');
  return (
    <AppTitleContainer>
      <Content>
        <LogoWrapper>
          {/* Logo, then title, then tagline: overlapping, each flying in over the same 1s */}
          <motion.div {...flyInFromBelow(0)} style={{ display: 'flex' }}>
            <Logo size={92} />
          </motion.div>
          <div>
            <motion.div {...flyInFromBelow(0.12)}>
              <LogoText level={2}>MARMALATAR</LogoText>
            </motion.div>
            <motion.div {...flyInFromBelow(0.18)}>
              <P>{t('appTitle.tagline')}</P>
            </motion.div>
          </div>
        </LogoWrapper>
      </Content>
    </AppTitleContainer>
  );
};
