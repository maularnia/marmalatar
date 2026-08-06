import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import Hr, { THrVariant } from '@src/toolkit/Hr/Hr';
import { appearUpSpring, appearUpSpringSlow } from '@src/toolkit/motion/transitions';
import H from '@ui-toolkit/H';
import { Logo } from '@ui-toolkit/Logo';
import P, { TPVariant } from '@ui-toolkit/P';
import { motion, MotionProps } from 'motion/react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const AppTitleContainer = styled.div`
  display: flex;
  align-items: stretch;
  align-self: center;
  justify-self: center;
  flex-direction: column;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
`;

const LogoWrapper = styled(motion.div)`
  display: inline-block;
  align-self: center;
  color: ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)};
  padding-bottom: ${CSSVar('size24')};
`;

const MarmalatarTitle = styled(H).attrs({ level: 2 })`
  line-height: 1 !important;
  text-transform: uppercase;
`;
const titleApperAnimation: MotionProps = {
  initial: {
    y: '100%',
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      y: { ...appearUpSpringSlow.animate.transition.y, delay: 0.2 },
      opacity: { ...appearUpSpringSlow.animate.transition.opacity, delay: 0.2 },
    },
  },
};
const TitleText = styled(motion.div).attrs(titleApperAnimation)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${CSSVar('size10')};
`;

export const AppTitle = () => {
  const { t } = useTranslation('app');

  return (
    <AppTitleContainer>
      <Content>
        <LogoWrapper {...appearUpSpring}>
          <Logo size={178} />
        </LogoWrapper>
        <TitleText>
          <MarmalatarTitle level={2}>{t('title.name')}</MarmalatarTitle>
          <Hr style={{ width: 120 }} variant={THrVariant.DIMMED} />
          <P variant={TPVariant.TERTIARY}>{t('title.subtitle')}</P>
        </TitleText>
      </Content>
    </AppTitleContainer>
  );
};
